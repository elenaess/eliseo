import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ArrowLeft,
  BookOpen,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Search,
  Star,
  Upload,
  X,
} from 'lucide-react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  errorCodes,
  isErrorWithCode,
  pick,
} from '@react-native-documents/picker';

import {
  viewDocument,
} from '@react-native-documents/viewer';

import {
  NativePressable,
} from '../components/NativePressable';

import {
  auth,
} from '../services/firebase';

import {
  createDriveFileRecord,
  createDriveFolder,
  ELISEO_DRIVE_LIMIT_BYTES,
  EliseoDriveFile,
  EliseoDriveFolder,
  listenToDriveFiles,
  listenToDriveFolders,
  listenToDriveUsage,
  releaseDriveBytes,
  reserveDriveBytes,
} from '../services/drive';

import {
  deleteStoredFile,
  uploadDriveFile,
} from '../services/storage';

import {
  useAppAppearance,
} from '../context/AppAppearanceContext';

import {
  colors,
  radii,
  spacing,
} from '../theme';

/* =========================================================
   LOADER RÁPIDO DAS ABAS INTERNAS
   ========================================================= */

type DriveTabLoaderProps = {
  visible: boolean;
  backgroundColor: string;
};

function DriveTabLoader({
  visible,
  backgroundColor,
}: DriveTabLoaderProps) {
  void backgroundColor;
  const rotation =
    useRef(
      new Animated.Value(0),
    ).current;

  useEffect(() => {
    if (!visible) {
      rotation.stopAnimation();
      rotation.setValue(0);
      return;
    }

    const loop =
      Animated.loop(
        Animated.timing(
          rotation,
          {
            toValue: 1,
            duration: 140,
            easing:
              Easing.linear,
            useNativeDriver:
              true,
          },
        ),
      );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [
    rotation,
    visible,
  ]);

  if (!visible) {
    return null;
  }

  const rotate =
    rotation.interpolate({
      inputRange: [0, 1],
      outputRange: [
        '0deg',
        '360deg',
      ],
    });

  return (
    <View
      pointerEvents="none"
      style={
        styles.driveTabLoader
      }
    >
      <Animated.View
        style={[
          styles.driveTabSpinner,
          {
            transform: [
              {rotate},
            ],
          },
        ]}
      >
        <View
          style={[
            styles.driveTabDot,
            styles.driveTabDotTop,
          ]}
        />

        <View
          style={[
            styles.driveTabDot,
            styles.driveTabDotRight,
          ]}
        />

        <View
          style={[
            styles.driveTabDot,
            styles.driveTabDotLeft,
          ]}
        />
      </Animated.View>
    </View>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function formatBytes(
  bytes: number,
) {
  if (!bytes) {
    return '0 B';
  }

  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (
    bytes <
    1024 *
      1024 *
      1024
  ) {
    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    1024 /
    1024 /
    1024
  ).toFixed(2)} GB`;
}

function fileExtension(
  name: string,
) {
  const parts =
    name.split('.');

  if (
    parts.length < 2
  ) {
    return '';
  }

  return (
    parts
      .pop()
      ?.toLowerCase() ??
    ''
  );
}

function fileKind(
  file:
    EliseoDriveFile,
) {
  const extension =
    fileExtension(
      file.name,
    );

  const type =
    (
      file.contentType ||
      ''
    ).toLowerCase();

  if (
    type.startsWith(
      'image/',
    )
  ) {
    return 'image';
  }

  if (
    extension ===
      'pdf' ||
    type.includes(
      'pdf',
    )
  ) {
    return 'pdf';
  }

  if (
    [
      'xlsx',
      'xls',
      'csv',
    ].includes(
      extension,
    )
  ) {
    return 'sheet';
  }

  if (
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'py',
      'java',
      'kt',
      'c',
      'cpp',
      'html',
      'css',
      'json',
    ].includes(
      extension,
    )
  ) {
    return 'code';
  }

  if (
    [
      'zip',
      'rar',
      '7z',
      'tar',
      'gz',
    ].includes(
      extension,
    )
  ) {
    return 'archive';
  }

  if (
    [
      'doc',
      'docx',
      'txt',
      'md',
      'rtf',
    ].includes(
      extension,
    )
  ) {
    return 'document';
  }

  return 'file';
}

function FileIcon({
  file,
}: {
  file:
    EliseoDriveFile;
}) {
  const kind =
    fileKind(file);

  if (
    kind === 'image'
  ) {
    return (
      <FileImage
        size={26}
        color="#58A6FF"
      />
    );
  }

  if (
    kind === 'pdf'
  ) {
    return (
      <FileText
        size={26}
        color="#FF7185"
      />
    );
  }

  if (
    kind === 'sheet'
  ) {
    return (
      <FileSpreadsheet
        size={26}
        color="#58C997"
      />
    );
  }

  if (
    kind === 'code'
  ) {
    return (
      <FileCode2
        size={26}
        color="#A981FF"
      />
    );
  }

  if (
    kind === 'archive'
  ) {
    return (
      <FileArchive
        size={26}
        color="#E4AF55"
      />
    );
  }

  return (
    <File
      size={26}
      color={
        colors.textSoft
      }
    />
  );
}

/* =========================================================
   DRIVE
   ========================================================= */

function DriveScreenContent() {
  const insets =
    useSafeAreaInsets();

  const {
    palette,
  } = useAppAppearance();

  const [
    folders,
    setFolders,
  ] =
    useState<
      EliseoDriveFolder[]
    >([]);

  const [
    files,
    setFiles,
  ] =
    useState<
      EliseoDriveFile[]
    >([]);

  const [
    usedBytes,
    setUsedBytes,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    currentFolderId,
    setCurrentFolderId,
  ] =
    useState<
      string | null
    >(null);

  const [
    searchOpen,
    setSearchOpen,
  ] =
    useState(false);

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    createOpen,
    setCreateOpen,
  ] =
    useState(false);

  const [
    folderName,
    setFolderName,
  ] =
    useState('');

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    previewFile,
    setPreviewFile,
  ] =
    useState<
      EliseoDriveFile | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<
      | 'folders'
      | 'library'
      | 'favorites'
    >('folders');

  const [
    tabSwitching,
    setTabSwitching,
  ] =
    useState(false);

  const tabSwitchTimer =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const currentUid =
    auth.currentUser
      ?.uid ?? '';

  useEffect(() => {
    return () => {
      if (
        tabSwitchTimer.current
      ) {
        clearTimeout(
          tabSwitchTimer.current,
        );
      }
    };
  }, []);

  /* =======================================================
     FIRESTORE
     ======================================================= */

  useEffect(() => {
    if (
      !currentUid
    ) {
      setLoading(false);
      return;
    }

    let gotFolders =
      false;

    let gotFiles =
      false;

    function checkLoaded() {
      if (
        gotFolders &&
        gotFiles
      ) {
        setLoading(false);
      }
    }

    const stopFolders =
      listenToDriveFolders(
        currentUid,

        incoming => {
          gotFolders =
            true;

          setFolders(
            incoming,
          );

          checkLoaded();
        },
      );

    const stopFiles =
      listenToDriveFiles(
        currentUid,

        incoming => {
          gotFiles =
            true;

          setFiles(
            incoming,
          );

          checkLoaded();
        },
      );

    const stopUsage =
      listenToDriveUsage(
        currentUid,
        setUsedBytes,
      );

    return () => {
      stopFolders();
      stopFiles();
      stopUsage();
    };
  }, [
    currentUid,
  ]);

  /* =======================================================
     PASTA ATUAL
     ======================================================= */

  const currentFolder =
    useMemo(
      () =>
        currentFolderId
          ? folders.find(
              folder =>
                folder.id ===
                currentFolderId,
            ) ?? null
          : null,

      [
        folders,
        currentFolderId,
      ],
    );

  const cleanSearch =
    search
      .trim()
      .toLowerCase();

  const visibleFolders =
    useMemo(
      () =>
        folders.filter(
          folder =>
            folder.parentId ===
              currentFolderId &&
            (
              !cleanSearch ||
              folder.name
                .toLowerCase()
                .includes(
                  cleanSearch,
                )
            ),
        ),

      [
        folders,
        currentFolderId,
        cleanSearch,
      ],
    );

  const visibleFiles =
    useMemo(
      () =>
        files.filter(
          file =>
            file.folderId ===
              currentFolderId &&
            (
              !cleanSearch ||
              file.name
                .toLowerCase()
                .includes(
                  cleanSearch,
                )
            ),
        ),

      [
        files,
        currentFolderId,
        cleanSearch,
      ],
    );

  const usagePercent =
    Math.min(
      100,
      (
        usedBytes /
        ELISEO_DRIVE_LIMIT_BYTES
      ) * 100,
    );

  /* =======================================================
     AÇÕES
     ======================================================= */

  function goUp() {
    if (
      !currentFolder
    ) {
      return;
    }

    setCurrentFolderId(
      currentFolder.parentId,
    );

    setSearch('');
  }

  function openFolder(
    folderId: string,
  ) {
    setCurrentFolderId(
      folderId,
    );

    setSearch('');
    setSearchOpen(false);
  }

  async function openFile(
    file:
      EliseoDriveFile,
  ) {
    if (
      !file.url
    ) {
      setError(
        'Esse arquivo não possui uma URL válida.',
      );

      return;
    }

    setError('');

    if (
      fileKind(file) ===
      'image'
    ) {
      setPreviewFile(
        file,
      );

      return;
    }

    try {
      await viewDocument({
        uri:
          file.url,

        mimeType:
          file.contentType ||
          undefined,
      });
    } catch {
      try {
        const supported =
          await Linking.canOpenURL(
            file.url,
          );

        if (
          !supported
        ) {
          throw new Error();
        }

        await Linking.openURL(
          file.url,
        );
      } catch {
        setError(
          'Não foi possível abrir o arquivo.',
        );
      }
    }
  }

  async function handleCreateFolder() {
    if (
      !currentUid ||
      saving
    ) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await createDriveFolder(
        currentUid,
        folderName,
        currentFolderId,
      );

      setFolderName('');
      setCreateOpen(false);
    } catch (
      caught
    ) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível criar a pasta.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload() {
    if (
      !currentUid ||
      uploading
    ) {
      return;
    }

    try {
      setError('');

      const pickedFiles =
        await pick({
          mode:
            'import',

          allowMultiSelection:
            true,
        });

      if (
        pickedFiles.length ===
        0
      ) {
        return;
      }

      setUploading(true);

      for (
        const picked of
        pickedFiles
      ) {
        const originalSize =
          Number(
            picked.size ??
              0,
          );

        if (
          originalSize >
          ELISEO_DRIVE_LIMIT_BYTES
        ) {
          throw new Error(
            `${picked.name ?? 'Esse arquivo'} ultrapassa o limite de 5 GB.`,
          );
        }

        let reservedBytes =
          0;

        let uploadedKey =
          '';

        try {
          if (
            originalSize >
            0
          ) {
            await reserveDriveBytes(
              currentUid,
              originalSize,
            );

            reservedBytes =
              originalSize;
          }

          const uploaded =
            await uploadDriveFile(
              currentUid,
              {
                uri:
                  picked.uri,

                name:
                  picked.name ??
                  'arquivo',

                type:
                  picked.type,

                size:
                  picked.size,
              },
            );

          uploadedKey =
            uploaded.key;

          const finalSize =
            Number(
              uploaded.size ||
                originalSize ||
                0,
            );

          if (
            finalSize <=
            0
          ) {
            throw new Error(
              'Não foi possível determinar o tamanho do arquivo.',
            );
          }

          if (
            reservedBytes ===
            0
          ) {
            await reserveDriveBytes(
              currentUid,
              finalSize,
            );

            reservedBytes =
              finalSize;
          } else if (
            finalSize >
            reservedBytes
          ) {
            const difference =
              finalSize -
              reservedBytes;

            await reserveDriveBytes(
              currentUid,
              difference,
            );

            reservedBytes =
              finalSize;
          } else if (
            finalSize <
            reservedBytes
          ) {
            const difference =
              reservedBytes -
              finalSize;

            await releaseDriveBytes(
              currentUid,
              difference,
            );

            reservedBytes =
              finalSize;
          }

          await createDriveFileRecord(
            currentUid,
            currentFolderId,
            {
              name:
                picked.name ??
                'arquivo',

              key:
                uploaded.key,

              url:
                uploaded.url,

              size:
                finalSize,

              contentType:
                uploaded.contentType ||
                picked.type ||
                'application/octet-stream',
            },
          );
        } catch (
          caught
        ) {
          if (
            uploadedKey
          ) {
            try {
              await deleteStoredFile(
                uploadedKey,
              );
            } catch {
              // Mantém o erro principal.
            }
          }

          if (
            reservedBytes >
            0
          ) {
            try {
              await releaseDriveBytes(
                currentUid,
                reservedBytes,
              );
            } catch {
              // Mantém o erro principal.
            }
          }

          throw caught;
        }
      }
    } catch (
      caught
    ) {
      if (
        isErrorWithCode(
          caught,
        ) &&
        caught.code ===
          errorCodes.OPERATION_CANCELED
      ) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível enviar o arquivo.',
      );
    } finally {
      setUploading(false);
    }
  }

  function chooseTab(
    tab:
      | 'folders'
      | 'library'
      | 'favorites',
  ) {
    if (
      tab ===
      activeTab
    ) {
      return;
    }

    if (
      tabSwitchTimer.current
    ) {
      clearTimeout(
        tabSwitchTimer.current,
      );
    }

    setTabSwitching(true);
    setActiveTab(tab);

    if (
      tab !==
      'folders'
    ) {
      setError(
        tab ===
          'library'
          ? 'Biblioteca será conectada em seguida.'
          : 'Favoritos serão conectados em seguida.',
      );
    } else {
      setError('');
    }

    tabSwitchTimer.current =
      setTimeout(() => {
        setTabSwitching(false);
        tabSwitchTimer.current =
          null;
      }, 105);
  }

  /* =======================================================
     UI
     ======================================================= */

  return (
    <View
      style={[
        styles.root,

        {
          paddingTop:
            insets.top,
        },
      ]}
    >
      {/* ===================================================
          HEADER — PARTE NOVA QUE FICOU BOA
          =================================================== */}

      <View
        style={
          styles.header
        }
      >
        <Text
          style={
            styles.title
          }
        >
          Pastas
        </Text>

        <View
          style={
            styles.spacer
          }
        />

        <NativePressable
          haptic
          onPress={() =>
            setSearchOpen(
              current =>
                !current,
            )
          }
          style={
            styles.headerButton
          }
        >
          <View
            style={
              styles.headerButtonInner
            }
          >
            <Search
              size={20}
              color={
                colors.textSoft
              }
            />
          </View>
        </NativePressable>

        <NativePressable
          haptic
          disabled={
            uploading
          }
          onPress={() => {
            void handleUpload();
          }}
          style={
            styles.headerButton
          }
        >
          <View
            style={
              styles.headerButtonInner
            }
          >
            {uploading ? (
              <ActivityIndicator
                size="small"
                color={
                  colors.blue
                }
              />
            ) : (
              <Upload
                size={20}
                color={
                  colors.blue
                }
              />
            )}
          </View>
        </NativePressable>

        <NativePressable
          haptic
          onPress={() => {
            setFolderName('');
            setError('');
            setCreateOpen(true);
          }}
          style={
            styles.headerButton
          }
        >
          <View
            style={
              styles.headerButtonInner
            }
          >
            <FolderPlus
              size={20}
              color={
                colors.blue
              }
            />
          </View>
        </NativePressable>
      </View>

      {/* ===================================================
          ABAS — VISUAL ANTIGO
          =================================================== */}

      <View
        style={
          styles.tabs
        }
      >
        <NativePressable
          haptic
          onPress={() =>
            chooseTab(
              'folders',
            )
          }
          style={
            styles.tabPressable
          }
        >
          <View
            style={[
              styles.tab,

              activeTab ===
                'folders' &&
                styles.tabActive,
            ]}
          >
            <Folder
              size={17}
              color={
                activeTab ===
                'folders'
                  ? colors.blue
                  : colors.muted
              }
            />

            <Text
              style={[
                styles.tabText,

                activeTab ===
                  'folders' &&
                  styles.tabTextActive,
              ]}
            >
              Pastas
            </Text>
          </View>
        </NativePressable>

        <NativePressable
          haptic
          onPress={() =>
            chooseTab(
              'library',
            )
          }
          style={
            styles.tabPressable
          }
        >
          <View
            style={[
              styles.tab,

              activeTab ===
                'library' &&
                styles.tabActive,
            ]}
          >
            <BookOpen
              size={17}
              color={
                activeTab ===
                'library'
                  ? colors.blue
                  : colors.muted
              }
            />

            <Text
              style={[
                styles.tabText,

                activeTab ===
                  'library' &&
                  styles.tabTextActive,
              ]}
            >
              Biblioteca
            </Text>
          </View>
        </NativePressable>

        <NativePressable
          haptic
          onPress={() =>
            chooseTab(
              'favorites',
            )
          }
          style={
            styles.tabPressable
          }
        >
          <View
            style={[
              styles.tab,

              activeTab ===
                'favorites' &&
                styles.tabActive,
            ]}
          >
            <Star
              size={17}
              color={
                activeTab ===
                'favorites'
                  ? colors.blue
                  : colors.muted
              }
            />

            <Text
              style={[
                styles.tabText,

                activeTab ===
                  'favorites' &&
                  styles.tabTextActive,
              ]}
            >
              Favoritos
            </Text>
          </View>
        </NativePressable>
      </View>

      {/* ===================================================
          BUSCA
          =================================================== */}

      {searchOpen && (
        <View
          style={
            styles.searchArea
          }
        >
          <View
            style={
              styles.searchBox
            }
          >
            <Search
              size={18}
              color={
                colors.muted
              }
            />

            <TextInput
              value={
                search
              }
              onChangeText={
                setSearch
              }
              placeholder="Buscar arquivos e pastas"
              placeholderTextColor={
                colors.faint
              }
              style={
                styles.searchInput
              }
              autoFocus
            />

            {!!search && (
              <NativePressable
                onPress={() =>
                  setSearch('')
                }
                style={
                  styles.clearSearch
                }
              >
                <View
                  style={
                    styles.clearSearchInner
                  }
                >
                  <X
                    size={16}
                    color={
                      colors.muted
                    }
                  />
                </View>
              </NativePressable>
            )}
          </View>
        </View>
      )}

      {/* ===================================================
          VOLTAR / BREADCRUMB
          =================================================== */}

      {currentFolder && (
        <View
          style={
            styles.folderPath
          }
        >
          <NativePressable
            haptic
            onPress={
              goUp
            }
            style={
              styles.backButton
            }
          >
            <View
              style={
                styles.backButtonInner
              }
            >
              <ArrowLeft
                size={17}
                color={
                  colors.textSoft
                }
              />
            </View>
          </NativePressable>

          <View
            style={
              styles.pathText
            }
          >
            <Text
              style={
                styles.pathLabel
              }
            >
              Meu Drive
            </Text>

            <Text
              style={
                styles.pathSlash
              }
            >
              /
            </Text>

            <Text
              numberOfLines={1}
              style={
                styles.pathCurrent
              }
            >
              {currentFolder.name}
            </Text>
          </View>
        </View>
      )}

      {!!error && (
        <Text
          style={
            styles.error
          }
        >
          {error}
        </Text>
      )}

      {/* ===================================================
          CONTEÚDO
          =================================================== */}

      <View
        style={
          styles.contentStage
        }
      >
        {loading ? (
          <View
            style={
              styles.loading
            }
          >
          <ActivityIndicator
            size="small"
            color={
              colors.blue
            }
          />
        </View>
      ) : (
        <ScrollView
          style={
            styles.scroll
          }
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* ===============================================
              PASTAS
              =============================================== */}

          {activeTab ===
            'folders' && (
            <>
              <View
                style={
                  styles.sectionHeader
                }
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  {currentFolder
                    ? currentFolder.name
                    : 'Suas pastas'}
                </Text>

                <Text
                  style={
                    styles.sectionCount
                  }
                >
                  {
                    visibleFolders.length
                  }
                </Text>
              </View>

              {visibleFolders.length >
                0 && (
                <View
                  style={
                    styles.folderGrid
                  }
                >
                  {visibleFolders.map(
                    folder => {
                      const childFiles =
                        files.filter(
                          file =>
                            file.folderId ===
                            folder.id,
                        ).length;

                      const childFolders =
                        folders.filter(
                          candidate =>
                            candidate.parentId ===
                            folder.id,
                        ).length;

                      const count =
                        childFiles +
                        childFolders;

                      return (
                        <NativePressable
                          key={
                            folder.id
                          }
                          haptic
                          onPress={() =>
                            openFolder(
                              folder.id,
                            )
                          }
                          style={
                            styles.folderCardPressable
                          }
                        >
                          <View
                            style={
                              styles.folderCard
                            }
                          >
                            <View
                              style={
                                styles.folderTop
                              }
                            >
                              <View
                                style={
                                  styles.folderIcon
                                }
                              >
                                <Folder
                                  size={36}
                                  color={
                                    colors.blue
                                  }
                                  fill="rgba(66,169,255,0.13)"
                                />
                              </View>

                              <MoreHorizontal
                                size={18}
                                color={
                                  colors.faint
                                }
                              />
                            </View>

                            <View
                              style={
                                styles.folderBottom
                              }
                            >
                              <Text
                                numberOfLines={
                                  1
                                }
                                style={
                                  styles.folderName
                                }
                              >
                                {
                                  folder.name
                                }
                              </Text>

                              <Text
                                style={
                                  styles.folderMeta
                                }
                              >
                                {count}{' '}
                                {count ===
                                1
                                  ? 'item'
                                  : 'itens'}
                              </Text>
                            </View>
                          </View>
                        </NativePressable>
                      );
                    },
                  )}
                </View>
              )}

              {/* ===========================================
                  ARQUIVOS
                  =========================================== */}

              <View
                style={[
                  styles.sectionHeader,

                  visibleFolders.length >
                    0 &&
                    styles.filesHeader,
                ]}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Arquivos
                </Text>

                <Text
                  style={
                    styles.sectionCount
                  }
                >
                  {
                    visibleFiles.length
                  }
                </Text>

              </View>

              <View
                style={
                  styles.fileList
                }
              >
                {visibleFiles.map(
                  file => (
                    <NativePressable
                      key={
                        file.id
                      }
                      haptic
                      onPress={() =>
                        openFile(
                          file,
                        )
                      }
                      style={
                        styles.filePressable
                      }
                    >
                      <View
                        style={
                          styles.fileCard
                        }
                      >
                        <View
                          style={
                            styles.fileIconBox
                          }
                        >
                          <FileIcon
                            file={
                              file
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.fileText
                          }
                        >
                          <Text
                            numberOfLines={
                              1
                            }
                            style={
                              styles.fileName
                            }
                          >
                            {file.name}
                          </Text>

                          <Text
                            style={
                              styles.fileMeta
                            }
                          >
                            {formatBytes(
                              file.size,
                            )}
                            {'  ·  '}
                            {fileExtension(
                              file.name,
                            ).toUpperCase() ||
                              'ARQUIVO'}
                          </Text>
                        </View>

                        <MoreHorizontal
                          size={18}
                          color={
                            colors.faint
                          }
                        />
                      </View>
                    </NativePressable>
                  ),
                )}
              </View>

              {visibleFolders.length ===
                0 &&
                visibleFiles.length ===
                  0 && (
                  <View
                    style={
                      styles.empty
                    }
                  >
                    <View
                      style={
                        styles.emptyIcon
                      }
                    >
                      <Folder
                        size={37}
                        color={
                          colors.blue
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.emptyTitle
                      }
                    >
                      {cleanSearch
                        ? 'Nada encontrado'
                        : 'Pasta vazia'}
                    </Text>

                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      {cleanSearch
                        ? 'Tente buscar por outro nome.'
                        : 'Crie uma pasta ou envie um arquivo para começar.'}
                    </Text>
                  </View>
                )}

              {/* ===========================================
                  ARMAZENAMENTO DISCRETO
                  =========================================== */}

              <View
                style={
                  styles.storage
                }
              >
                <View
                  style={
                    styles.storageTextRow
                  }
                >
                  <Text
                    style={
                      styles.storageLabel
                    }
                  >
                    Armazenamento
                  </Text>

                  <Text
                    style={
                      styles.storageValue
                    }
                  >
                    {formatBytes(
                      usedBytes,
                    )}{' '}
                    de 5 GB
                  </Text>
                </View>

                <View
                  style={
                    styles.storageTrack
                  }
                >
                  <View
                    style={[
                      styles.storageFill,

                      {
                        width:
                          `${usagePercent}%` as `${number}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </>
          )}

          {activeTab !==
            'folders' && (
            <View
              style={
                styles.placeholder
              }
            >
              {activeTab ===
              'library' ? (
                <BookOpen
                  size={38}
                  color={
                    colors.blue
                  }
                />
              ) : (
                <Star
                  size={38}
                  color={
                    colors.blue
                  }
                />
              )}

              <Text
                style={
                  styles.placeholderTitle
                }
              >
                {activeTab ===
                'library'
                  ? 'Biblioteca'
                  : 'Favoritos'}
              </Text>

              <Text
                style={
                  styles.placeholderText
                }
              >
                Essa área será conectada depois.
              </Text>
            </View>
          )}
          </ScrollView>
        )}

        {tabSwitching && (
          <View
            pointerEvents="none"
            style={[
              styles.driveContentBlanker,
              {
                backgroundColor:
                  palette.bg,
              },
            ]}
          />
        )}
      </View>

      {/* Loader visual centralizado na SCREEN inteira.
          O conteúdo é apagado pelo blanker acima, mas
          header/abas permanecem imóveis e visíveis. */}
      <DriveTabLoader
        visible={
          tabSwitching
        }
        backgroundColor="transparent"
      />

      {/* ===================================================
          PREVIEW DE IMAGEM
          =================================================== */}

      <Modal
        visible={
          !!previewFile
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setPreviewFile(
            null,
          )
        }
      >
        <View
          style={
            styles.previewBackdrop
          }
        >
          <View
            style={
              styles.previewHeader
            }
          >
            <Text
              numberOfLines={1}
              style={
                styles.previewTitle
              }
            >
              {previewFile?.name}
            </Text>

            <NativePressable
              haptic
              onPress={() =>
                setPreviewFile(
                  null,
                )
              }
              style={
                styles.previewClose
              }
            >
              <View
                style={
                  styles.previewCloseInner
                }
              >
                <X
                  size={20}
                  color={
                    colors.textSoft
                  }
                />
              </View>
            </NativePressable>
          </View>

          {!!previewFile?.url && (
            <Image
              source={{
                uri:
                  previewFile.url,
              }}
              resizeMode="contain"
              style={
                styles.previewImage
              }
            />
          )}
        </View>
      </Modal>

      {/* ===================================================
          MODAL — NOVA PASTA
          =================================================== */}

      <Modal
        visible={
          createOpen
        }
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (
            !saving
          ) {
            setCreateOpen(false);
          }
        }}
      >
        <View
          style={
            styles.modalBackdrop
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                Nova pasta
              </Text>

              <NativePressable
                disabled={
                  saving
                }
                onPress={() =>
                  setCreateOpen(
                    false,
                  )
                }
                style={
                  styles.modalClose
                }
              >
                <View
                  style={
                    styles.modalCloseInner
                  }
                >
                  <X
                    size={19}
                    color={
                      colors.muted
                    }
                  />
                </View>
              </NativePressable>
            </View>

            <Text
              style={
                styles.modalLabel
              }
            >
              Nome da pasta
            </Text>

            <TextInput
              value={
                folderName
              }
              onChangeText={
                setFolderName
              }
              placeholder="Ex: Estudos"
              placeholderTextColor={
                colors.faint
              }
              style={
                styles.modalInput
              }
              maxLength={80}
              autoFocus
              editable={
                !saving
              }
              onSubmitEditing={
                handleCreateFolder
              }
            />

            <NativePressable
              haptic
              disabled={
                saving
              }
              onPress={
                handleCreateFolder
              }
              style={
                styles.modalSubmit
              }
            >
              <View
                style={
                  styles.modalSubmitInner
                }
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      colors.white
                    }
                  />
                ) : (
                  <Text
                    style={
                      styles.modalSubmitText
                    }
                  >
                    Criar pasta
                  </Text>
                )}
              </View>
            </NativePressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   WRAPPER
   ========================================================= */

export function DriveScreen() {
  return (
    <DriveScreenContent />
  );
}

/* =========================================================
   ESTILOS
   ========================================================= */

const styles =
  StyleSheet.create({
    root: {
      flex: 1,
      position: 'relative',

      backgroundColor: 'transparent',
    },

    contentStage: {
      flex: 1,
      position: 'relative',
    },

    driveContentBlanker: {
      ...StyleSheet.absoluteFillObject,

      zIndex: 20,
      elevation: 20,
    },

    driveTabLoader: {
      ...StyleSheet.absoluteFillObject,

      alignItems:
        'center',

      justifyContent:
        'center',

      zIndex: 30,
      elevation: 30,
    },

    driveTabSpinner: {
      width: 34,
      height: 34,
    },

    driveTabDot: {
      position:
        'absolute',

      width: 7,
      height: 7,

      borderRadius: 999,

      backgroundColor:
        colors.blue,
    },

    driveTabDotTop: {
      top: 0,
      left: 13.5,
    },

    driveTabDotRight: {
      right: 1,
      bottom: 5,
      opacity: 0.78,
    },

    driveTabDotLeft: {
      left: 1,
      bottom: 5,
      opacity: 0.5,
    },

    /* HEADER */

    header: {
      height: 64,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,

      paddingHorizontal:
        spacing.lg,
    },

    title: {
      color:
        colors.text,

      fontSize: 22,

      fontWeight:
        '700',

      letterSpacing:
        -0.5,
    },

    spacer: {
      flex: 1,
    },

    headerButton: {
      width: 40,
      height: 40,
    },

    headerButtonInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel2,

      borderRadius: 13,
    },

    /* ABAS */

    tabs: {
      height: 46,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,

      paddingHorizontal:
        spacing.md,

      marginBottom: 5,
    },

    tabPressable: {
      flex: 1,

      height: 38,
    },

    tab: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 6,

      borderRadius: 12,
    },

    tabActive: {
      backgroundColor:
        'rgba(66,169,255,0.09)',
    },

    tabText: {
      color:
        colors.muted,

      fontSize: 10,

      fontWeight:
        '600',
    },

    tabTextActive: {
      color:
        colors.blue,
    },

    /* SEARCH */

    searchArea: {
      paddingHorizontal:
        spacing.md,

      paddingBottom: 7,
    },

    searchBox: {
      height: 46,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,

      paddingHorizontal: 13,

      backgroundColor:
        colors.panel2,

      borderRadius:
        radii.md,
    },

    searchInput: {
      flex: 1,

      color:
        colors.text,

      fontSize: 13,
    },

    clearSearch: {
      width: 32,
      height: 32,
    },

    clearSearchInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    /* CAMINHO */

    folderPath: {
      height: 42,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.md,

      marginBottom: 3,
    },

    backButton: {
      width: 36,
      height: 36,
    },

    backButtonInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel2,

      borderRadius: 11,
    },

    pathText: {
      flex: 1,

      marginLeft: 10,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,
    },

    pathLabel: {
      color:
        colors.muted,

      fontSize: 10,
    },

    pathSlash: {
      color:
        colors.faint,

      fontSize: 10,
    },

    pathCurrent: {
      flex: 1,

      color:
        colors.textSoft,

      fontSize: 10,

      fontWeight:
        '700',
    },

    error: {
      marginHorizontal:
        spacing.lg,

      marginBottom: 5,

      color:
        '#FF8798',

      fontSize: 10,
    },

    loading: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    scroll: {
      flex: 1,
    },

    content: {
      paddingHorizontal:
        spacing.md,

      paddingTop: 5,

      paddingBottom: 90,
    },

    /* SEÇÕES */

    sectionHeader: {
      height: 35,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    sectionTitle: {
      flex: 1,

      color:
        colors.textSoft,

      fontSize: 12,

      fontWeight:
        '700',
    },

    sectionCount: {
      color:
        colors.faint,

      fontSize: 9,

      fontWeight:
        '600',
    },

    filesHeader: {
      marginTop: 12,
    },

    /* GRID DE PASTAS */

    folderGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',

      rowGap: 8,
    },

    folderCardPressable: {
      width: '48.8%',

      height: 126,
    },

    folderCard: {
      flex: 1,

      padding: 13,

      justifyContent:
        'space-between',

      backgroundColor:
        colors.panel,

      borderRadius:
        radii.lg,
    },

    folderTop: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',
    },

    folderIcon: {
      width: 48,
      height: 48,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(66,169,255,0.07)',

      borderRadius: 14,
    },

    folderBottom: {
      marginTop: 10,
    },

    folderName: {
      color:
        colors.text,

      fontSize: 13,

      fontWeight:
        '700',
    },

    folderMeta: {
      marginTop: 4,

      color:
        colors.faint,

      fontSize: 9,
    },

    /* ARQUIVOS */

    fileList: {
      gap: 6,
    },

    filePressable: {
      height: 66,
    },

    fileCard: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal: 10,

      backgroundColor:
        colors.panel,

      borderRadius:
        radii.md,
    },

    fileIconBox: {
      width: 43,
      height: 43,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel2,

      borderRadius: 12,
    },

    fileText: {
      flex: 1,

      marginLeft: 11,
    },

    fileName: {
      color:
        colors.text,

      fontSize: 12,

      fontWeight:
        '700',
    },

    fileMeta: {
      marginTop: 4,

      color:
        colors.faint,

      fontSize: 9,
    },

    /* EMPTY */

    empty: {
      minHeight: 215,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 30,
    },

    emptyIcon: {
      width: 66,
      height: 66,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(66,169,255,0.07)',

      borderRadius: 21,
    },

    emptyTitle: {
      marginTop: 12,

      color:
        colors.text,

      fontSize: 14,

      fontWeight:
        '700',
    },

    emptyText: {
      marginTop: 5,

      color:
        colors.faint,

      fontSize: 10,

      lineHeight: 15,

      textAlign:
        'center',
    },

    /* STORAGE */

    storage: {
      marginTop: 20,

      paddingTop: 13,

      borderTopWidth: 1,

      borderTopColor:
        'rgba(255,255,255,0.05)',
    },

    storageTextRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 8,
    },

    storageLabel: {
      flex: 1,

      color:
        colors.muted,

      fontSize: 9,

      fontWeight:
        '600',
    },

    storageValue: {
      color:
        colors.faint,

      fontSize: 8,
    },

    storageTrack: {
      height: 4,

      overflow:
        'hidden',

      backgroundColor:
        colors.panel2,

      borderRadius: 4,
    },

    storageFill: {
      height:
        '100%',

      backgroundColor:
        colors.blue2,

      borderRadius: 4,
    },

    /* PLACEHOLDERS */

    placeholder: {
      minHeight: 360,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    placeholderTitle: {
      marginTop: 12,

      color:
        colors.text,

      fontSize: 15,

      fontWeight:
        '700',
    },

    placeholderText: {
      marginTop: 5,

      color:
        colors.faint,

      fontSize: 10,
    },

    /* PREVIEW */

    previewBackdrop: {
      flex: 1,

      paddingTop: 18,
      paddingHorizontal: 14,
      paddingBottom: 18,

      backgroundColor:
        'rgba(3,7,13,0.96)',
    },

    previewHeader: {
      height: 52,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 10,
    },

    previewTitle: {
      flex: 1,

      color:
        colors.text,

      fontSize: 13,

      fontWeight:
        '700',
    },

    previewClose: {
      width: 42,
      height: 42,
    },

    previewCloseInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel2,

      borderRadius: 13,
    },

    previewImage: {
      flex: 1,

      width: '100%',

      borderRadius:
        radii.lg,
    },

    /* MODAL */

    modalBackdrop: {
      flex: 1,

      justifyContent:
        'center',

      paddingHorizontal: 22,

      backgroundColor:
        'rgba(3,7,13,0.80)',
    },

    modalCard: {
      width: '100%',

      maxWidth: 440,

      alignSelf:
        'center',

      padding: 18,

      backgroundColor:
        colors.panel,

      borderRadius:
        radii.xl,
    },

    modalHeader: {
      minHeight: 44,

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 14,
    },

    modalTitle: {
      flex: 1,

      color:
        colors.text,

      fontSize: 18,

      fontWeight:
        '700',
    },

    modalClose: {
      width: 40,
      height: 40,
    },

    modalCloseInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel2,

      borderRadius: 13,
    },

    modalLabel: {
      marginBottom: 7,

      color:
        colors.textSoft,

      fontSize: 11,

      fontWeight:
        '600',
    },

    modalInput: {
      height: 50,

      paddingHorizontal: 14,

      color:
        colors.text,

      backgroundColor:
        colors.panel2,

      borderRadius: 14,

      fontSize: 13,
    },

    modalSubmit: {
      height: 49,

      marginTop: 15,
    },

    modalSubmitInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.blue2,

      borderRadius: 14,
    },

    modalSubmitText: {
      color:
        colors.white,

      fontSize: 13,

      fontWeight:
        '700',
    },
  });