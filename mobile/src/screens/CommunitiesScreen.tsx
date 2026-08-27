import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  BottomTabScreenProps,
} from '@react-navigation/bottom-tabs';

import type {
  CompositeScreenProps,
} from '@react-navigation/native';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  ChevronRight,
  Plus,
  Search,
  X,
} from 'lucide-react-native';

import Animated, {
  FadeInDown,
} from 'react-native-reanimated';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  NativePressable,
} from '../components/NativePressable';

import {
  ServerRail,
} from '../components/ServerRail';

import {
  auth,
  createServer,
  EliseoServer,
  joinServerById,
  listenToUserServers,
} from '../services/firebase';

import {
  colors,
  radii,
  spacing,
} from '../theme';

import type {
  MainTabParamList,
  RootStackParamList,
} from '../types/navigation';

type Props =
  CompositeScreenProps<
    BottomTabScreenProps<
      MainTabParamList,
      'Communities'
    >,
    NativeStackScreenProps<
      RootStackParamList
    >
  >;

function getAccent(
  serverId: string,
) {
  const accents = [
    '#536DFE',
    '#7C5CFC',
    '#3F8CFF',
    '#8B5CF6',
    '#5B7FFF',
    '#667EEA',
  ];

  let total = 0;

  for (
    let index = 0;
    index < serverId.length;
    index++
  ) {
    total +=
      serverId.charCodeAt(
        index,
      );
  }

  return accents[
    total %
      accents.length
  ];
}

export function CommunitiesScreen({
  navigation,
}: Props) {
  const insets =
    useSafeAreaInsets();

  const [
    servers,
    setServers,
  ] =
    useState<
      EliseoServer[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    createOpen,
    setCreateOpen,
  ] =
    useState(false);

  const [
    joinOpen,
    setJoinOpen,
  ] =
    useState(false);

  const [
    serverName,
    setServerName,
  ] =
    useState('');

  const [
    joinId,
    setJoinId,
  ] =
    useState('');

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(() => {
    const user =
      auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe =
      listenToUserServers(
        user.uid,
        incoming => {
          setServers(
            incoming,
          );

          setLoading(
            false,
          );
        },
      );

    return unsubscribe;
  }, []);

  function openCreate() {
    setServerName('');
    setError('');
    setCreateOpen(true);
  }

  function openJoin() {
    setJoinId('');
    setError('');
    setJoinOpen(true);
  }

  function closeModals() {
    if (saving) {
      return;
    }

    setCreateOpen(false);
    setJoinOpen(false);
    setError('');
  }

  async function handleCreate() {
    const user =
      auth.currentUser;

    if (!user) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const serverId =
        await createServer(
          user.uid,
          serverName,
        );

      setCreateOpen(false);
      setServerName('');

      navigation.navigate(
        'Server',
        {
          serverId,
        },
      );
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'Não foi possível criar o servidor.';

      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleJoin() {
    const user =
      auth.currentUser;

    if (!user) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const server =
        await joinServerById(
          joinId,
          user.uid,
        );

      setJoinOpen(false);
      setJoinId('');

      navigation.navigate(
        'Server',
        {
          serverId:
            server.id,
        },
      );
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'Não foi possível entrar no servidor.';

      setError(message);
    } finally {
      setSaving(false);
    }
  }

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
          Comunidades
        </Text>

        <View
          style={
            styles.spacer
          }
        />

        <NativePressable
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
      </View>

      <ServerRail
        servers={
          servers
        }
        onCreateServer={
          openCreate
        }
        onOpenServer={
          serverId =>
            navigation.navigate(
              'Server',
              {
                serverId,
              },
            )
        }
      />

      <View
        style={
          styles.quickRow
        }
      >
        <NativePressable
          haptic
          onPress={
            openCreate
          }
          style={
            styles.quickButton
          }
        >
          <View
            style={
              styles.quickInner
            }
          >
            <Plus
              size={18}
              color={
                colors.blue
              }
            />

            <Text
              style={
                styles.quickText
              }
            >
              Criar
            </Text>
          </View>
        </NativePressable>

        <NativePressable
          haptic
          onPress={
            openJoin
          }
          style={
            styles.quickButton
          }
        >
          <View
            style={
              styles.quickInner
            }
          >
            <Text
              style={
                styles.quickText
              }
            >
              Entrar por ID
            </Text>
          </View>
        </NativePressable>
      </View>

      <Text
        style={
          styles.sectionTitle
        }
      >
        Seus servidores
      </Text>

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
        <FlatList
          data={
            servers
          }
          keyExtractor={
            item =>
              item.id
          }
          contentContainerStyle={
            styles.list
          }
          showsVerticalScrollIndicator={
            false
          }
          ListEmptyComponent={
            <View
              style={
                styles.empty
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                Nenhum servidor ainda
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Crie uma comunidade ou entre usando um ID.
              </Text>
            </View>
          }
          renderItem={({
            item,
            index,
          }) => (
            <Animated.View
              entering={FadeInDown
                .duration(220)
                .delay(
                  index *
                    45,
                )}
            >
              <NativePressable
                haptic
                onPress={() =>
                  navigation.navigate(
                    'Server',
                    {
                      serverId:
                        item.id,
                    },
                  )
                }
                style={
                  styles.serverRow
                }
              >
                <View
                  style={
                    styles.serverRowInner
                  }
                >
                  <View
                    style={[
                      styles.serverIcon,

                      {
                        backgroundColor:
                          getAccent(
                            item.id,
                          ),
                      },
                    ]}
                  >
                    {!!item.photo ? (
                      <Image
                        source={{
                          uri:
                            item.photo,
                        }}
                        style={
                          styles.serverImage
                        }
                        resizeMode="cover"
                      />
                    ) : (
                      <Text
                        style={
                          styles.serverInitial
                        }
                      >
                        {item.name
                          .charAt(
                            0,
                          )
                          .toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <View
                    style={
                      styles.serverText
                    }
                  >
                    <Text
                      style={
                        styles.serverName
                      }
                    >
                      {item.name}
                    </Text>

                    <Text
                      style={
                        styles.serverMeta
                      }
                    >
                      {
                        item
                          .members
                          .length
                      }{' '}
                      {item
                        .members
                        .length ===
                      1
                        ? 'membro'
                        : 'membros'}
                    </Text>
                  </View>

                  <ChevronRight
                    size={20}
                    color={
                      colors.faint
                    }
                  />
                </View>
              </NativePressable>
            </Animated.View>
          )}
        />
      )}

      <Modal
        visible={
          createOpen
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeModals
        }
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
                Criar servidor
              </Text>

              <NativePressable
                disabled={
                  saving
                }
                onPress={
                  closeModals
                }
                style={
                  styles.closeButton
                }
              >
                <View
                  style={
                    styles.closeInner
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
              Nome
            </Text>

            <TextInput
              value={
                serverName
              }
              onChangeText={
                setServerName
              }
              placeholder="Minha comunidade"
              placeholderTextColor={
                colors.faint
              }
              style={
                styles.input
              }
              editable={
                !saving
              }
              autoFocus
              maxLength={
                40
              }
              onSubmitEditing={
                handleCreate
              }
            />

            {!!error && (
              <Text
                style={
                  styles.error
                }
              >
                {error}
              </Text>
            )}

            <NativePressable
              haptic
              disabled={
                saving
              }
              onPress={
                handleCreate
              }
              style={
                styles.submit
              }
            >
              <View
                style={
                  styles.submitInner
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
                      styles.submitText
                    }
                  >
                    Criar servidor
                  </Text>
                )}
              </View>
            </NativePressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          joinOpen
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeModals
        }
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
                Entrar por ID
              </Text>

              <NativePressable
                disabled={
                  saving
                }
                onPress={
                  closeModals
                }
                style={
                  styles.closeButton
                }
              >
                <View
                  style={
                    styles.closeInner
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
              ID do servidor
            </Text>

            <TextInput
              value={
                joinId
              }
              onChangeText={
                setJoinId
              }
              placeholder="Cole o ID aqui"
              placeholderTextColor={
                colors.faint
              }
              style={
                styles.input
              }
              editable={
                !saving
              }
              autoFocus
              autoCapitalize="none"
              autoCorrect={
                false
              }
              onSubmitEditing={
                handleJoin
              }
            />

            {!!error && (
              <Text
                style={
                  styles.error
                }
              >
                {error}
              </Text>
            )}

            <NativePressable
              haptic
              disabled={
                saving
              }
              onPress={
                handleJoin
              }
              style={
                styles.submit
              }
            >
              <View
                style={
                  styles.submitInner
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
                      styles.submitText
                    }
                  >
                    Entrar
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

const styles =
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: 'transparent',
    },

    header: {
      minHeight: 64,

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

      borderRadius:
        13,
    },

    quickRow: {
      flexDirection:
        'row',

      gap: 8,

      paddingHorizontal:
        spacing.md,

      paddingVertical:
        8,
    },

    quickButton: {
      flex: 1,
      height: 46,
    },

    quickInner: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 7,

      backgroundColor:
        colors.panel2,

      borderRadius:
        radii.md,
    },

    quickText: {
      color:
        colors.textSoft,

      fontSize: 12,

      fontWeight:
        '700',
    },

    sectionTitle: {
      marginTop: 12,
      marginBottom: 10,

      paddingHorizontal:
        spacing.lg,

      color:
        colors.muted,

      fontSize: 11,

      fontWeight:
        '700',

      textTransform:
        'uppercase',

      letterSpacing:
        0.8,
    },

    loading: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    list: {
      paddingHorizontal:
        spacing.md,

      gap: 7,

      paddingBottom:
        24,

      flexGrow: 1,
    },

    serverRow: {
      height: 72,
    },

    serverRowInner: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        12,

      backgroundColor:
        colors.panel,

      borderRadius:
        radii.lg,
    },

    serverIcon: {
      width: 48,
      height: 48,

      overflow:
        'hidden',

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    serverImage: {
      width: '100%',
      height: '100%',
    },

    serverInitial: {
      color:
        colors.white,

      fontSize: 18,

      fontWeight:
        '800',
    },

    serverText: {
      flex: 1,

      marginLeft:
        12,
    },

    serverName: {
      color:
        colors.text,

      fontSize: 14,

      fontWeight:
        '700',
    },

    serverMeta: {
      marginTop: 3,

      color:
        colors.faint,

      fontSize: 10,
    },

    empty: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,

      paddingBottom:
        60,
    },

    emptyTitle: {
      color:
        colors.text,

      fontSize: 15,

      fontWeight:
        '700',
    },

    emptyText: {
      marginTop: 6,

      color:
        colors.muted,

      fontSize: 11,

      lineHeight: 16,

      textAlign:
        'center',
    },

    modalBackdrop: {
      flex: 1,

      paddingHorizontal:
        22,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(3,7,13,0.78)',
    },

    modalCard: {
      width: '100%',

      maxWidth: 440,

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

      marginBottom:
        15,
    },

    modalTitle: {
      flex: 1,

      color:
        colors.text,

      fontSize: 18,

      fontWeight:
        '700',
    },

    closeButton: {
      width: 40,
      height: 40,
    },

    closeInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel2,

      borderRadius:
        13,
    },

    modalLabel: {
      marginBottom: 7,

      color:
        colors.textSoft,

      fontSize: 11,

      fontWeight:
        '600',
    },

    input: {
      height: 50,

      paddingHorizontal:
        14,

      color:
        colors.text,

      backgroundColor:
        colors.panel2,

      borderRadius:
        14,

      fontSize: 13,
    },

    error: {
      marginTop: 10,

      color:
        '#FF8798',

      fontSize: 11,

      lineHeight: 16,
    },

    submit: {
      height: 49,

      marginTop:
        16,
    },

    submitInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.blue2,

      borderRadius:
        14,
    },

    submitText: {
      color:
        colors.white,

      fontSize: 13,

      fontWeight:
        '700',
    },
  });