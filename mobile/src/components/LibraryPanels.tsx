import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {BookOpen, File, Search, Star} from 'lucide-react-native';
import {viewDocument} from '@react-native-documents/viewer';

import {NativePressable} from './NativePressable';
import {auth} from '../services/firebase';
import {
  LibraryBook,
  LibraryFavorite,
  listenToLibraryFavorites,
  openLibraryCoverUrl,
  resolvePublicBookFile,
  searchOpenLibrary,
  setLibraryFavorite,
} from '../services/library';
import {
  EliseoDriveFile,
  listenToDriveFavorites,
  listenToDriveFiles,
  toggleDriveFileFavorite,
} from '../services/drive';
import {colors, radii} from '../theme';

function BookCard({book, favorite, onFavorite, onOpen}: {book: LibraryBook; favorite: boolean; onFavorite: () => void; onOpen: () => void}) {
  const cover = openLibraryCoverUrl(book.coverId);
  return (
    <View style={styles.bookCell}>
      <NativePressable haptic onPress={onOpen} style={styles.coverPress}>
        <View style={styles.cover}>
          {cover ? <Image source={{uri: cover}} resizeMode="cover" style={styles.coverImage} /> : <BookOpen size={28} color={colors.faint} />}
        </View>
      </NativePressable>
      <View style={styles.bookInfo}>
        <Text numberOfLines={2} style={styles.bookTitle}>{book.title}</Text>
        <Text numberOfLines={1} style={styles.bookAuthor}>{book.author}</Text>
        <View style={styles.bookMetaRow}>
          <Text style={styles.bookYear}>{book.firstPublishYear || '—'}</Text>
          <NativePressable haptic onPress={onFavorite} style={styles.starPress}>
            <View style={styles.starInner}>
              <Star size={16} color={favorite ? '#F2B94B' : colors.faint} fill={favorite ? '#F2B94B' : 'transparent'} />
            </View>
          </NativePressable>
        </View>
      </View>
    </View>
  );
}

export function LibraryPanel() {
  const navigation = useNavigation<any>();
  const uid = auth.currentUser?.uid ?? '';
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [favorites, setFavorites] = useState<LibraryFavorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) return;
    return listenToLibraryFavorites(uid, setFavorites);
  }, [uid]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setBooks([]);
      setError('');
      return;
    }
    const timer = setTimeout(() => {
      let active = true;
      setLoading(true);
      setError('');
      searchOpenLibrary(q)
        .then(result => { if (active) setBooks(result); })
        .catch(caught => { if (active) setError(caught instanceof Error ? caught.message : 'Erro na busca.'); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, 450);
    return () => clearTimeout(timer);
  }, [search]);

  const favoriteKeys = useMemo(() => new Set(favorites.map(item => item.key)), [favorites]);

  async function openBook(book: LibraryBook) {
    try {
      setError('');
      if (book.ebookAccess !== 'public') {
        setError('Essa edição não possui leitura pública liberada.');
        return;
      }
      setLoading(true);
      const resolved = await resolvePublicBookFile(book);
      if (!resolved) {
        setError('A Open Library não forneceu PDF/EPUB público para essa edição.');
        return;
      }
      navigation.navigate('BookReader', {
        title: book.title,
        bookKey: book.key,
        url: resolved.url,
        format: resolved.type,
        book,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.searchBox}>
        <Search size={18} color={colors.faint} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar livros na Open Library"
          placeholderTextColor={colors.faint}
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator size="small" color={colors.blue} style={styles.loader} />}
      {!loading && search.trim().length < 2 && <Text style={styles.helper}>Digite pelo menos 2 caracteres para buscar.</Text>}
      {!loading && search.trim().length >= 2 && books.length === 0 && !error && <Text style={styles.helper}>Nenhum livro encontrado.</Text>}
      <View style={styles.grid}>
        {books.map(book => (
          <BookCard
            key={book.key}
            book={book}
            favorite={favoriteKeys.has(book.key)}
            onFavorite={() => void setLibraryFavorite(uid, book, !favoriteKeys.has(book.key))}
            onOpen={() => void openBook(book)}
          />
        ))}
      </View>
    </View>
  );
}

export function DriveFavoritesPanel() {
  const navigation = useNavigation<any>();
  const uid = auth.currentUser?.uid ?? '';
  const [books, setBooks] = useState<LibraryFavorite[]>([]);
  const [files, setFiles] = useState<EliseoDriveFile[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const favoriteFiles = useMemo(() => files.filter(file => fileIds.includes(file.id)), [files, fileIds]);

  useEffect(() => {
    if (!uid) return;
    const a = listenToLibraryFavorites(uid, setBooks);
    const b = listenToDriveFiles(uid, setFiles);
    const c = listenToDriveFavorites(uid, setFileIds);
    return () => {a(); b(); c();};
  }, [uid]);

  async function openBook(book: LibraryFavorite) {
    const resolved = await resolvePublicBookFile(book);
    if (resolved) navigation.navigate('BookReader', {title: book.title, bookKey: book.key, url: resolved.url, format: resolved.type, book});
  }

  async function openFile(file: EliseoDriveFile) {
    try {
      await viewDocument({uri: file.url, mimeType: file.contentType || undefined});
    } catch {
      if (await Linking.canOpenURL(file.url)) await Linking.openURL(file.url);
    }
  }

  if (!books.length && !favoriteFiles.length) {
    return <View style={styles.empty}><Star size={32} color={colors.faint}/><Text style={styles.helper}>Seus livros e arquivos estrelados aparecerão aqui.</Text></View>;
  }

  return (
    <View style={styles.panel}>
      {!!books.length && <Text style={styles.section}>Livros</Text>}
      <View style={styles.grid}>
        {books.map(book => <BookCard key={book.key} book={book} favorite onFavorite={() => void setLibraryFavorite(uid, book, false)} onOpen={() => void openBook(book)} />)}
      </View>
      {!!favoriteFiles.length && <Text style={styles.section}>Arquivos</Text>}
      <View style={styles.files}>
        {favoriteFiles.map(file => (
          <View key={file.id} style={styles.fileRow}>
            <NativePressable haptic onPress={() => void openFile(file)} style={styles.fileOpen}>
              <View style={styles.fileInner}><File size={20} color={colors.blue}/><View style={styles.fileText}><Text numberOfLines={1} style={styles.fileName}>{file.name}</Text><Text style={styles.fileType}>{file.contentType}</Text></View></View>
            </NativePressable>
            <NativePressable haptic onPress={() => void toggleDriveFileFavorite(uid, file.id, false)} style={styles.fileStar}><View style={styles.starInner}><Star size={17} color="#F2B94B" fill="#F2B94B"/></View></NativePressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {paddingTop: 4, paddingBottom: 40},
  searchBox: {height: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderRadius: radii.lg, backgroundColor: colors.panel2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border},
  searchInput: {flex: 1, color: colors.text, fontSize: 13},
  loader: {marginTop: 24},
  helper: {marginTop: 20, color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 16},
  error: {marginTop: 12, color: colors.red, fontSize: 11, textAlign: 'center'},
  grid: {marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: '2.75%'},
  bookCell: {width: '31.5%', marginBottom: 18},
  coverPress: {width: '100%', aspectRatio: 0.67},
  cover: {flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.panel2},
  coverImage: {...StyleSheet.absoluteFill, width: undefined, height: undefined},
  bookInfo: {paddingTop: 7},
  bookTitle: {color: colors.text, fontSize: 10.5, lineHeight: 14, fontWeight: '700'},
  bookAuthor: {marginTop: 3, color: colors.muted, fontSize: 9},
  bookMetaRow: {minHeight: 27, marginTop: 2, flexDirection: 'row', alignItems: 'center'},
  bookYear: {flex: 1, color: colors.faint, fontSize: 8.5},
  starPress: {width: 28, height: 28},
  starInner: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  section: {marginTop: 18, color: colors.textSoft, fontSize: 12, fontWeight: '800'},
  empty: {paddingVertical: 46, alignItems: 'center'},
  files: {marginTop: 10, gap: 8},
  fileRow: {minHeight: 58, flexDirection: 'row', alignItems: 'center', borderRadius: radii.lg, backgroundColor: colors.panel2},
  fileOpen: {flex: 1, minHeight: 58},
  fileInner: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 13},
  fileText: {flex: 1},
  fileName: {color: colors.text, fontSize: 11, fontWeight: '700'},
  fileType: {marginTop: 2, color: colors.faint, fontSize: 8},
  fileStar: {width: 48, height: 58},
});
