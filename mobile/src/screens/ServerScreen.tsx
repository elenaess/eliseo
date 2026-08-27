import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  ArrowLeft,
  ChevronRight,
  Hash,
  MoreHorizontal,
  Phone,
  Plus,
  X,
} from 'lucide-react-native';

import LinearGradient from 'react-native-linear-gradient';

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
  ScreenHeader,
} from '../components/ScreenHeader';

import {
  auth,
  createServerChannel,
  EliseoChannel,
  EliseoServer,
  listenToServer,
  listenToServerChannels,
} from '../services/firebase';

import {
  listenToChannelCallPresence,
  makeChannelCallRoomId,
} from '../services/calls';

import type {
  EliseoCallPresence,
} from '../services/calls';

import {
  colors,
  radii,
  spacing,
} from '../theme';

import type {
  RootStackParamList,
} from '../types/navigation';

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Server'
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

function ChannelRow({
  serverId,
  channel,
  navigation,
  index,
}: {
  serverId: string;
  channel: EliseoChannel;
  navigation: Props['navigation'];
  index: number;
}) {
  const [
    presence,
    setPresence,
  ] =
    useState<
      EliseoCallPresence | null
    >(null);

  useEffect(() => {
    return listenToChannelCallPresence(
      serverId,
      channel.id,
      setPresence,
    );
  }, [
    serverId,
    channel.id,
  ]);

  const activeParticipants =
    presence?.active
      ? presence.participants
      : [];

  function openTextChannel() {
    navigation.navigate(
      'Chat',
      {
        conversationId:
          `channel:${serverId}:${channel.id}`,
        name:
          `# ${channel.name}`,
        serverId,
        channelId:
          channel.id,
      },
    );
  }

  function openVoiceCall() {
    navigation.navigate(
      'Call',
      {
        roomId:
          makeChannelCallRoomId(
            serverId,
            channel.id,
          ),
        contextType:
          'server',
        serverId,
        channelId:
          channel.id,
        title:
          `# ${channel.name}`,
        startWithVideo:
          false,
      },
    );
  }

  return (
    <Animated.View
      entering={FadeInDown
        .duration(210)
        .delay(
          index * 45,
        )}
      style={
        styles.channelRow
      }
    >
      <NativePressable
        haptic
        onPress={
          openTextChannel
        }
        style={
          styles.channelMain
        }
      >
        <View
          style={
            styles.channelInner
          }
        >
          <View
            style={
              styles.hash
            }
          >
            <Hash
              size={18}
              color={
                colors.blue
              }
            />
          </View>

          <View
            style={
              styles.channelText
            }
          >
            <Text
              numberOfLines={1}
              style={
                styles.channelName
              }
            >
              {channel.name}
            </Text>

            {activeParticipants.length >
              0 && (
              <View
                style={
                  styles.callPresence
                }
              >
                <View
                  style={
                    styles.callAvatars
                  }
                >
                  {activeParticipants
                    .slice(0, 3)
                    .map(
                      participant => (
                        <View
                          key={
                            `${participant.uid}-${participant.sessionId}`
                          }
                          style={
                            styles.callAvatar
                          }
                        >
                          <Avatar
                            name={
                              participant.username
                            }
                            uri={
                              participant.avatar
                            }
                            accent={
                              colors.blue2
                            }
                            size={18}
                          />
                        </View>
                      ),
                    )}
                </View>

                <Text
                  numberOfLines={1}
                  style={
                    styles.callPresenceText
                  }
                >
                  Em chamada
                  {activeParticipants.length >
                  3
                    ? ` +${
                        activeParticipants.length -
                        3
                      }`
                    : ''}
                </Text>
              </View>
            )}
          </View>

          <ChevronRight
            size={19}
            color={
              colors.faint
            }
          />
        </View>
      </NativePressable>

      <NativePressable
        haptic
        onPress={
          openVoiceCall
        }
        style={
          styles.callButton
        }
      >
        <View
          style={[
            styles.callButtonInner,
            activeParticipants.length >
              0 &&
              styles.callButtonActive,
          ]}
        >
          <Phone
            size={17}
            color={
              activeParticipants.length >
              0
                ? colors.blue
                : colors.textSoft
            }
          />
        </View>
      </NativePressable>
    </Animated.View>
  );
}

export function ServerScreen({
  navigation,
  route,
}: Props) {
  const insets =
    useSafeAreaInsets();

  const serverId =
    route.params.serverId;

  const [
    server,
    setServer,
  ] =
    useState<
      EliseoServer | null
    >(null);

  const [
    channels,
    setChannels,
  ] =
    useState<
      EliseoChannel[]
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
    channelName,
    setChannelName,
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
    const unsubscribe =
      listenToServer(
        serverId,

        incoming => {
          setServer(
            incoming,
          );

          setLoading(
            false,
          );
        },
      );

    return unsubscribe;
  }, [
    serverId,
  ]);

  useEffect(() => {
    const unsubscribe =
      listenToServerChannels(
        serverId,

        incoming => {
          setChannels(
            incoming,
          );
        },
      );

    return unsubscribe;
  }, [
    serverId,
  ]);

  const currentUid =
    auth.currentUser?.uid ??
    '';

  const owner =
    !!server &&
    server.ownerId ===
      currentUid;

  async function handleCreateChannel() {
    if (
      !currentUid
    ) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await createServerChannel(
        serverId,
        currentUid,
        channelName,
      );

      setChannelName('');
      setCreateOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível criar o canal.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    loading
  ) {
    return (
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
    );
  }

  if (
    !server
  ) {
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
        <ScreenHeader
          title="Servidor"
          left={
            <NativePressable
              haptic
              onPress={() =>
                navigation.goBack()
              }
              style={
                styles.headerAction
              }
            >
              <View
                style={
                  styles.headerActionInner
                }
              >
                <ArrowLeft
                  size={22}
                  color={
                    colors.textSoft
                  }
                />
              </View>
            </NativePressable>
          }
        />

        <View
          style={
            styles.notFound
          }
        >
          <Text
            style={
              styles.notFoundTitle
            }
          >
            Servidor não encontrado
          </Text>
        </View>
      </View>
    );
  }

  const accent =
    getAccent(
      server.id,
    );

  const heroContent = (
    <>
      <Text
        style={
          styles.heroTitle
        }
      >
        {server.name}
      </Text>

      <Text
        style={
          styles.heroMeta
        }
      >
        ELÍSEO · COMUNIDADE
      </Text>
    </>
  );

  return (
    <View
      style={[
        styles.root,

        {
          paddingTop:
            insets.top,

          paddingBottom:
            insets.bottom,
        },
      ]}
    >
      <ScreenHeader
        title={
          server.name
        }
        subtitle={`${
          server.members.length
        } ${
          server.members.length ===
          1
            ? 'membro'
            : 'membros'
        }`}
        left={
          <NativePressable
            haptic
            onPress={() =>
              navigation.goBack()
            }
            style={
              styles.headerAction
            }
          >
            <View
              style={
                styles.headerActionInner
              }
            >
              <ArrowLeft
                size={22}
                color={
                  colors.textSoft
                }
              />
            </View>
          </NativePressable>
        }
        right={
          <NativePressable
            haptic
            style={
              styles.headerAction
            }
          >
            <View
              style={
                styles.headerActionInner
              }
            >
              <MoreHorizontal
                size={22}
                color={
                  colors.textSoft
                }
              />
            </View>
          </NativePressable>
        }
      />

      {!!server.banner ? (
        <ImageBackground
          source={{
            uri:
              server.banner,
          }}
          resizeMode="cover"
          style={
            styles.hero
          }
          imageStyle={
            styles.heroImage
          }
        >
          <View
            style={
              styles.heroOverlay
            }
          >
            {
              heroContent
            }
          </View>
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={[
            accent,
            '#111B2B',
          ]}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={
            styles.hero
          }
        >
          {
            heroContent
          }
        </LinearGradient>
      )}

      <View
        style={
          styles.sectionRow
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Canais de texto
        </Text>

        {owner && (
          <NativePressable
            haptic
            onPress={() => {
              setChannelName('');
              setError('');
              setCreateOpen(true);
            }}
            style={
              styles.plus
            }
          >
            <View
              style={
                styles.plusInner
              }
            >
              <Plus
                size={18}
                color={
                  colors.muted
                }
              />
            </View>
          </NativePressable>
        )}
      </View>

      <FlatList
        data={
          channels
        }
        keyExtractor={
          item =>
            item.id
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
                styles.emptyText
              }
            >
              Nenhum canal neste servidor.
            </Text>
          </View>
        }
        renderItem={({
          item,
          index,
        }) => (
          <ChannelRow
            serverId={
              server.id
            }
            channel={
              item
            }
            navigation={
              navigation
            }
            index={
              index
            }
          />
        )}
      />

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
            setCreateOpen(
              false,
            );
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
                Criar canal
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

            <Text
              style={
                styles.label
              }
            >
              Nome do canal
            </Text>

            <TextInput
              value={
                channelName
              }
              onChangeText={
                setChannelName
              }
              placeholder="ex: geral"
              placeholderTextColor={
                colors.faint
              }
              style={
                styles.input
              }
              maxLength={
                30
              }
              autoCapitalize="none"
              autoCorrect={
                false
              }
              autoFocus
              editable={
                !saving
              }
              onSubmitEditing={
                handleCreateChannel
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
                handleCreateChannel
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
                    Criar canal
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

    loading: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor: 'transparent',
    },

    headerAction: {
      width: 44,
      height: 44,
    },

    headerActionInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        14,

      backgroundColor:
        colors.panel2,
    },

    hero: {
      minHeight: 170,

      marginHorizontal:
        spacing.md,

      marginTop: 4,

      padding: 18,

      justifyContent:
        'flex-end',

      borderRadius:
        radii.xl,

      overflow:
        'hidden',
    },

    heroImage: {
      borderRadius:
        radii.xl,
    },

    heroOverlay: {
      position:
        'absolute',

      left: 0,
      right: 0,
      top: 0,
      bottom: 0,

      padding: 18,

      justifyContent:
        'flex-end',

      backgroundColor:
        'rgba(5,10,20,0.36)',
    },

    heroTitle: {
      color:
        colors.white,

      fontSize: 26,

      fontWeight:
        '800',

      letterSpacing:
        -0.7,
    },

    heroMeta: {
      marginTop: 5,

      color:
        'rgba(255,255,255,0.68)',

      fontSize: 10,

      fontWeight:
        '700',

      letterSpacing:
        1.5,
    },

    sectionRow: {
      minHeight: 52,

      marginTop: 12,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.lg,
    },

    sectionTitle: {
      color:
        colors.muted,

      fontSize: 11,

      fontWeight:
        '700',

      textTransform:
        'uppercase',

      letterSpacing:
        0.7,
    },

    plus: {
      width: 38,
      height: 38,

      marginLeft:
        'auto',
    },

    plusInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        12,
    },

    list: {
      paddingHorizontal:
        spacing.md,

      gap: 6,

      paddingBottom: 24,
    },

    channelRow: {
      minHeight: 58,

      flexDirection:
        'row',

      alignItems:
        'stretch',

      gap: 6,
    },

    channelMain: {
      flex: 1,

      minHeight: 58,
    },

    channelInner: {
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
        radii.md,
    },

    hash: {
      width: 36,
      height: 36,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(66,169,255,0.08)',

      borderRadius:
        12,
    },

    channelText: {
      flex: 1,

      minWidth: 0,

      marginLeft: 10,
    },

    channelName: {
      color:
        colors.textSoft,

      fontSize: 14,

      fontWeight:
        '600',
    },

    callPresence: {
      height: 20,

      marginTop: 2,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,
    },

    callAvatars: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    callAvatar: {
      marginRight: -4,

      borderWidth: 1.5,

      borderColor:
        colors.panel,

      borderRadius: 10,
    },

    callPresenceText: {
      color:
        colors.blue,

      fontSize: 9,

      fontWeight:
        '600',
    },

    callButton: {
      width: 48,

      minHeight: 58,
    },

    callButtonInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel,

      borderRadius:
        radii.md,
    },

    callButtonActive: {
      backgroundColor:
        'rgba(66,169,255,0.09)',
    },

    empty: {
      paddingVertical:
        30,

      alignItems:
        'center',
    },

    emptyText: {
      color:
        colors.faint,

      fontSize: 12,
    },

    notFound: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    notFoundTitle: {
      color:
        colors.text,

      fontSize: 16,

      fontWeight:
        '700',
    },

    modalBackdrop: {
      flex: 1,

      justifyContent:
        'center',

      paddingHorizontal:
        22,

      backgroundColor:
        'rgba(3,7,13,0.78)',
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

      marginBottom: 15,
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

    label: {
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
    },

    submit: {
      height: 49,

      marginTop: 16,
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