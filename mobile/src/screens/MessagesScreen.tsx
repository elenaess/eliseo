import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
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
  Edit3,
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
  Avatar,
} from '../components/Avatar';

import {
  NativePressable,
} from '../components/NativePressable';

import {
  auth,
  ConversationListItem,
  EliseoUser,
  getOrCreateConversation,
  listenToUserConversations,
  searchUsers,
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
      'Messages'
    >,
    NativeStackScreenProps<
      RootStackParamList
    >
  >;

function formatTime(
  timestamp: any,
) {
  const date =
    timestamp
      ?.toDate?.();

  if (
    !date
  ) {
    return '';
  }

  const now =
    new Date();

  if (
    date.toDateString() ===
    now.toDateString()
  ) {
    return date.toLocaleTimeString(
      'pt-BR',

      {
        hour:
          '2-digit',

        minute:
          '2-digit',
      },
    );
  }

  return date.toLocaleDateString(
    'pt-BR',

    {
      day:
        '2-digit',

      month:
        '2-digit',
    },
  );
}

export function MessagesScreen({
  navigation,
}: Props) {
  const insets =
    useSafeAreaInsets();

  const [
    conversations,
    setConversations,
  ] =
    useState<
      ConversationListItem[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

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
    results,
    setResults,
  ] =
    useState<
      EliseoUser[]
    >([]);

  const [
    searching,
    setSearching,
  ] =
    useState(false);

  const [
    opening,
    setOpening,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState('');

  const currentUid =
    auth.currentUser?.uid ??
    '';

  useEffect(() => {
    if (
      !currentUid
    ) {
      setLoading(false);
      return;
    }

    const unsubscribe =
      listenToUserConversations(
        currentUid,

        incoming => {
          setConversations(
            incoming,
          );

          setLoading(
            false,
          );
        },
      );

    return unsubscribe;
  }, [
    currentUid,
  ]);

  useEffect(() => {
    if (
      !searchOpen ||
      !currentUid
    ) {
      return;
    }

    const clean =
      search.trim();

    if (
      !clean
    ) {
      setResults([]);
      setSearching(false);

      return;
    }

    setSearching(true);

    const timeout =
      setTimeout(
        async () => {
          try {
            const incoming =
              await searchUsers(
                clean,
                currentUid,
              );

            setResults(
              incoming,
            );
          } catch {
            setResults([]);
          } finally {
            setSearching(
              false,
            );
          }
        },

        250,
      );

    return () =>
      clearTimeout(
        timeout,
      );
  }, [
    search,
    searchOpen,
    currentUid,
  ]);

  function openSearch() {
    setSearch('');
    setResults([]);
    setError('');
    setSearchOpen(true);
  }

  async function openUser(
    user: EliseoUser,
  ) {
    if (
      !currentUid ||
      opening
    ) {
      return;
    }

    try {
      setOpening(
        user.uid,
      );

      setError('');

      const conversationId =
        await getOrCreateConversation(
          currentUid,
          user.uid,
        );

      setSearchOpen(
        false,
      );

      navigation.navigate(
        'Chat',

        {
          conversationId,

          name:
            user.username,

          otherUid:
            user.uid,
        },
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível abrir a conversa.',
      );
    } finally {
      setOpening(null);
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
          Mensagens
        </Text>

        <View
          style={
            styles.headerSpacer
          }
        />

        <NativePressable
          haptic
          onPress={
            openSearch
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
          onPress={
            openSearch
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
            <Edit3
              size={19}
              color={
                colors.textSoft
              }
            />
          </View>
        </NativePressable>
      </View>

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
            conversations
          }
          keyExtractor={
            item =>
              item.id
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.list
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
                Nenhuma conversa
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Busque alguém pelo nome de usuário para começar.
              </Text>
            </View>
          }
          renderItem={({
            item,
            index,
          }) => (
            <Animated.View
              entering={FadeInDown
                .duration(
                  210,
                )
                .delay(
                  index *
                    40,
                )}
            >
              <NativePressable
                haptic
                onPress={() =>
                  navigation.navigate(
                    'Chat',

                    {
                      conversationId:
                        item.id,

                      name:
                        item
                          .otherUser
                          .username,

                      otherUid:
                        item
                          .otherUser
                          .uid,
                    },
                  )
                }
                style={
                  styles.dm
                }
              >
                <View
                  style={
                    styles.dmInner
                  }
                >
                  <Avatar
                    name={
                      item
                        .otherUser
                        .username
                    }
                    uri={
                      item
                        .otherUser
                        .avatar
                    }
                    accent={
                      colors.blue2
                    }
                    size={
                      50
                    }
                  />

                  <View
                    style={
                      styles.dmText
                    }
                  >
                    <View
                      style={
                        styles.nameRow
                      }
                    >
                      <Text
                        style={
                          styles.name
                        }
                      >
                        {
                          item
                            .otherUser
                            .username
                        }
                      </Text>

                      <Text
                        style={
                          styles.time
                        }
                      >
                        {formatTime(
                          item.lastMessageAt,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.previewRow
                      }
                    >
                      <Text
                        numberOfLines={
                          1
                        }
                        style={
                          styles.preview
                        }
                      >
                        {item.lastMessage ||
                          'Nova conversa'}
                      </Text>

                      {item.unread >
                        0 && (
                        <View
                          style={
                            styles.unread
                          }
                        >
                          <Text
                            style={
                              styles.unreadText
                            }
                          >
                            {item.unread >
                            99
                              ? '99+'
                              : item.unread}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </NativePressable>
            </Animated.View>
          )}
        />
      )}

      <Modal
        visible={
          searchOpen
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSearchOpen(
            false,
          )
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
                Nova conversa
              </Text>

              <NativePressable
                onPress={() =>
                  setSearchOpen(
                    false,
                  )
                }
                style={
                  styles.close
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

            <View
              style={
                styles.searchBox
              }
            >
              <Search
                size={19}
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
                placeholder="Buscar @usuário"
                placeholderTextColor={
                  colors.faint
                }
                autoCapitalize="none"
                autoCorrect={
                  false
                }
                autoFocus
                style={
                  styles.searchInput
                }
              />

              {searching && (
                <ActivityIndicator
                  size="small"
                  color={
                    colors.blue
                  }
                />
              )}
            </View>

            {!!error && (
              <Text
                style={
                  styles.error
                }
              >
                {error}
              </Text>
            )}

            <FlatList
              data={
                results
              }
              keyExtractor={
                item =>
                  item.uid
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.results
              }
              ListEmptyComponent={
  search.trim() &&
  !searching ? (
    <Text
      style={
        styles.noResults
      }
    >
      Nenhum usuário encontrado.
    </Text>
  ) : undefined
}
              renderItem={({
                item,
              }) => (
                <NativePressable
                  haptic
                  disabled={
                    !!opening
                  }
                  onPress={() =>
                    openUser(
                      item,
                    )
                  }
                  style={
                    styles.result
                  }
                >
                  <View
                    style={
                      styles.resultInner
                    }
                  >
                    <Avatar
                      name={
                        item.username
                      }
                      uri={
                        item.avatar
                      }
                      accent={
                        colors.purple
                      }
                      size={
                        45
                      }
                    />

                    <View
                      style={
                        styles.resultText
                      }
                    >
                      <Text
                        style={
                          styles.resultName
                        }
                      >
                        {item.username}
                      </Text>

                      <Text
                        style={
                          styles.resultHandle
                        }
                      >
                        @{item.username}
                      </Text>
                    </View>

                    {opening ===
                      item.uid && (
                      <ActivityIndicator
                        size="small"
                        color={
                          colors.blue
                        }
                      />
                    )}
                  </View>
                </NativePressable>
              )}
            />
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

    headerSpacer: {
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

    loading: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    list: {
      flexGrow: 1,

      paddingHorizontal:
        spacing.md,

      gap: 6,

      paddingBottom:
        24,
    },

    dm: {
      minHeight: 76,
    },

    dmInner: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        11,

      backgroundColor:
        colors.panel,

      borderRadius:
        radii.lg,
    },

    dmText: {
      flex: 1,

      marginLeft: 12,
    },

    nameRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    name: {
      flex: 1,

      color:
        colors.text,

      fontSize: 14,

      fontWeight:
        '700',
    },

    time: {
      color:
        colors.faint,

      fontSize: 9,
    },

    previewRow: {
      marginTop: 5,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    preview: {
      flex: 1,

      color:
        colors.muted,

      fontSize: 11,
    },

    unread: {
      minWidth: 20,
      height: 20,

      marginLeft: 8,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        6,

      backgroundColor:
        colors.blue2,

      borderRadius:
        10,
    },

    unreadText: {
      color:
        colors.white,

      fontSize: 9,

      fontWeight:
        '800',
    },

    empty: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

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

      textAlign:
        'center',
    },

    modalBackdrop: {
      flex: 1,

      justifyContent:
        'center',

      paddingHorizontal:
        20,

      backgroundColor:
        'rgba(3,7,13,0.80)',
    },

    modalCard: {
      width: '100%',

      maxWidth: 460,
      maxHeight: '72%',

      alignSelf:
        'center',

      padding: 16,

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

      marginBottom: 10,
    },

    modalTitle: {
      flex: 1,

      color:
        colors.text,

      fontSize: 18,

      fontWeight:
        '700',
    },

    close: {
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

    searchBox: {
      height: 50,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,

      paddingHorizontal:
        13,

      backgroundColor:
        colors.panel2,

      borderRadius:
        14,
    },

    searchInput: {
      flex: 1,

      color:
        colors.text,

      fontSize: 13,
    },

    error: {
      marginTop: 9,

      color:
        '#FF8798',

      fontSize: 11,
    },

    results: {
      paddingTop: 10,

      gap: 5,
    },

    result: {
      height: 65,
    },

    resultInner: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        9,

      borderRadius:
        radii.md,
    },

    resultText: {
      flex: 1,

      marginLeft: 11,
    },

    resultName: {
      color:
        colors.text,

      fontSize: 13,

      fontWeight:
        '700',
    },

    resultHandle: {
      marginTop: 3,

      color:
        colors.faint,

      fontSize: 10,
    },

    noResults: {
      paddingVertical: 28,

      color:
        colors.faint,

      fontSize: 11,

      textAlign:
        'center',
    },
  });