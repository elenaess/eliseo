import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Pdf from 'react-native-pdf';
import RNFS from 'react-native-fs';
import {
  Reader,
  ReaderProvider,
} from '@epubjs-react-native/core';
import {useFileSystem} from '@epubjs-react-native/file-system';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft, Star} from 'lucide-react-native';

import {NativePressable} from '../components/NativePressable';
import {auth} from '../services/firebase';
import {
  LibraryFavorite,
  listenToLibraryFavorites,
  setLibraryFavorite,
} from '../services/library';
import {colors} from '../theme';
import type {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'BookReader'>;

type CacheMeta = {
  sourceUrl: string;
  format: 'pdf' | 'epub';
  savedAt: number;
};

function safeCacheName(
  bookKey: string,
  format: 'pdf' | 'epub',
) {
  const base =
    bookKey
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(-90) || 'book';

  return `${RNFS.CachesDirectoryPath}/eliseo-library-${base}.${format}`;
}

async function removeIfExists(path: string) {
  if (await RNFS.exists(path)) {
    await RNFS.unlink(path).catch(() => {});
  }
}

async function readCacheMeta(
  path: string,
): Promise<CacheMeta | null> {
  try {
    if (!(await RNFS.exists(path))) {
      return null;
    }

    const raw = await RNFS.readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<CacheMeta>;

    if (
      typeof parsed.sourceUrl !== 'string' ||
      (parsed.format !== 'pdf' && parsed.format !== 'epub')
    ) {
      return null;
    }

    return parsed as CacheMeta;
  } catch {
    return null;
  }
}

async function isNonEmptyFile(path: string) {
  try {
    if (!(await RNFS.exists(path))) {
      return false;
    }

    const stat = await RNFS.stat(path);
    return Number(stat.size || 0) > 0;
  } catch {
    return false;
  }
}

async function clearBookCache(
  cachePath: string,
  metaPath: string,
) {
  await Promise.all([
    removeIfExists(cachePath),
    removeIfExists(metaPath),
    removeIfExists(`${cachePath}.part`),
  ]);
}

async function downloadBookAtomically({
  url,
  cachePath,
  metaPath,
  format,
}: {
  url: string;
  cachePath: string;
  metaPath: string;
  format: 'pdf' | 'epub';
}) {
  if (!/^https:\/\//i.test(url)) {
    throw new Error('A fonte remota do livro precisa usar HTTPS.');
  }

  const partialPath = `${cachePath}.part`;
  await removeIfExists(partialPath);

  const download = RNFS.downloadFile({
    fromUrl: url,
    toFile: partialPath,
    discretionary: true,
    background: false,
  });

  try {
    const result = await download.promise;

    if (
      result.statusCode < 200 ||
      result.statusCode >= 300 ||
      result.bytesWritten <= 0 ||
      !(await isNonEmptyFile(partialPath))
    ) {
      throw new Error('A fonte do livro retornou um arquivo inválido.');
    }

    await removeIfExists(cachePath);
    await RNFS.moveFile(partialPath, cachePath);

    await RNFS.writeFile(
      metaPath,
      JSON.stringify({
        sourceUrl: url,
        format,
        savedAt: Date.now(),
      } satisfies CacheMeta),
      'utf8',
    );
  } catch (caught) {
    try {
      RNFS.stopDownload(download.jobId);
    } catch {
      // O job pode ja ter sido encerrado pela camada nativa.
    }
    await removeIfExists(partialPath);
    throw caught;
  }
}

function ReaderContent({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const uid = auth.currentUser?.uid ?? '';
  const {url, format, book, bookKey} = route.params;

  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState('');
  const [localUri, setLocalUri] = useState('');
  const [loading, setLoading] = useState(true);
  const [cacheRevision, setCacheRevision] = useState(0);

  const rendererRetryUsedRef = useRef(false);

  const cachePath = useMemo(
    () => safeCacheName(bookKey, format),
    [bookKey, format],
  );

  const metaPath = useMemo(
    () => `${cachePath}.meta.json`,
    [cachePath],
  );

  useEffect(() => {
    rendererRetryUsedRef.current = false;
  }, [bookKey, format, url]);

  useEffect(() => {
    if (!uid) {
      return;
    }

    return listenToLibraryFavorites(
      uid,
      (items: LibraryFavorite[]) => {
        setFavorite(
          items.some(item => item.key === book.key),
        );
      },
    );
  }, [uid, book.key]);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      setLoading(true);
      setError('');
      setLocalUri('');

      try {
        const meta = await readCacheMeta(metaPath);
        const cacheValid =
          (await isNonEmptyFile(cachePath)) &&
          meta?.sourceUrl === url &&
          meta?.format === format;

        if (!cacheValid) {
          await clearBookCache(cachePath, metaPath);
          await downloadBookAtomically({
            url,
            cachePath,
            metaPath,
            format,
          });
        }

        if (!(await isNonEmptyFile(cachePath))) {
          throw new Error('O arquivo do livro está vazio.');
        }

        if (!cancelled) {
          setLocalUri(`file://${cachePath}`);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Não foi possível preparar esse livro para leitura.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [cachePath, metaPath, url, format, cacheRevision]);

  const handleRendererFailure = useCallback(
    async (caught: unknown) => {
      if (!rendererRetryUsedRef.current) {
        rendererRetryUsedRef.current = true;
        setError('Reconstruindo o cache do livro…');
        await clearBookCache(cachePath, metaPath);
        setCacheRevision(value => value + 1);
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : String(caught || 'Não foi possível renderizar esse livro.'),
      );
    },
    [cachePath, metaPath],
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      <View style={styles.header}>
        <NativePressable
          haptic
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <View style={styles.headerInner}>
            <ArrowLeft size={22} color={colors.text}/>
          </View>
        </NativePressable>

        <Text numberOfLines={1} style={styles.title}>
          {route.params.title}
        </Text>

        <NativePressable
          haptic
          onPress={() => void setLibraryFavorite(uid, book, !favorite)}
          style={styles.headerButton}
        >
          <View style={styles.headerInner}>
            <Star
              size={21}
              color={favorite ? '#F2B94B' : colors.textSoft}
              fill={favorite ? '#F2B94B' : 'transparent'}
            />
          </View>
        </NativePressable>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.readerShell}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={colors.blue}/>
            <Text style={styles.loadingText}>Preparando leitura…</Text>
          </View>
        ) : !localUri ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>
              Esse arquivo não pôde ser aberto.
            </Text>
          </View>
        ) : format === 'pdf' ? (
          <Pdf
            key={`${localUri}:${cacheRevision}`}
            source={{uri: localUri, cache: false}}
            style={styles.pdf}
            trustAllCerts={false}
            enablePaging={false}
            horizontal={false}
            onLoadComplete={() => setError('')}
            onError={caught => {
              void handleRendererFailure(caught);
            }}
            renderActivityIndicator={() => (
              <ActivityIndicator size="small" color={colors.blue}/>
            )}
          />
        ) : (
          <View style={styles.epubFrame}>
            <Reader
              key={`${localUri}:${cacheRevision}`}
              src={localUri}
              fileSystem={useFileSystem}
              allowScriptedContent={false}
              allowPopups={false}
              onReady={() => setError('')}
              onDisplayError={caught => {
                void handleRendererFailure(caught);
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

export function BookReaderScreen(props: Props) {
  return (
    <ReaderProvider>
      <ReaderContent {...props}/>
    </ReaderProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 46,
    height: 46,
  },
  headerInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    paddingHorizontal: 8,
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  readerShell: {
    flex: 1,
    paddingTop: 6,
  },
  epubFrame: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 4,
    overflow: 'hidden',
    borderRadius: 8,
  },
  pdf: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  error: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.red,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
