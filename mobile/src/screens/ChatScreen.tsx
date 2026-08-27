import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {useRef} from 'react';

import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
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
  Image as ImageIcon,
  Phone,
  Send,
  Video,
  CircleDollarSign,
  X,
} from 'lucide-react-native';

import Animated, {
  FadeInUp,
} from 'react-native-reanimated';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Avatar,
} from '../components/Avatar';

import {
  PixPanel,
} from '../components/PixPanel';

import type {
  PixPanelContext,
} from '../components/PixPanel';

import {
  NativePressable,
} from '../components/NativePressable';

import {
  ScreenHeader,
} from '../components/ScreenHeader';

import {
  auth,
  EliseoUser,
  getUserById,
  listenToUserProfile,
  markConversationRead,
  sendChannelMessage,
  sendFirestoreMessage,
} from '../services/firebase';

import {
  EliseoMediaMessage,
  listenToMediaChannelMessages,
  listenToMediaMessages,
  pickSingleImage,
  sendChannelMediaMessage,
  sendDmMediaMessage,
} from '../services/media';

import {
  uploadChatImage,
  uploadCommunityImage,
} from '../services/storage';

import {
  createPixRequest,
  getServerPixMemberByUsername,
  parsePixAmount,
} from '../services/pix';

import {
  listenToChannelCallPresence,
  listenToDmCallPresence,
  makeChannelCallRoomId,
  makeDmCallRoomId,
} from '../services/calls';

import type {
  EliseoCallPresence,
} from '../services/calls';

import {
  markServerChannelRead,
} from '../services/notifications';

import {
  notifyDmMessage,
  notifyServerMessage,
} from '../services/push';

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
    'Chat'
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
    return 'agora';
  }

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

export function ChatScreen({
  navigation,
  route,
}: Props) {
  const insets =
    useSafeAreaInsets();


  /* ELISEO_CHAT_UX */
  const messageListRef =
    useRef<FlatList<EliseoMediaMessage>>(null);

  const didInitialScrollRef =
    useRef(false);

  const [
    text,
    setText,
  ] =
    useState('');

  const [
    dmMessages,
    setDmMessages,
  ] =
    useState<
      EliseoMediaMessage[]
    >([]);

  const [
    channelMessages,
    setChannelMessages,
  ] =
    useState<
      EliseoMediaMessage[]
    >([]);

  const [
    authors,
    setAuthors,
  ] =
    useState<
      Record<
        string,
        EliseoUser | null
      >
    >({});

  const [
    otherUser,
    setOtherUser,
  ] =
    useState<
      EliseoUser | null
    >(null);

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    selectedImage,
    setSelectedImage,
  ] =
    useState<
      Awaited<
        ReturnType<
          typeof pickSingleImage
        >
      >
    >(null);

  const [
    mediaError,
    setMediaError,
  ] =
    useState('');

  const [
    callPresence,
    setCallPresence,
  ] =
    useState<
      EliseoCallPresence | null
    >(null);

  const [
    pixOpen,
    setPixOpen,
  ] =
    useState(false);

  const serverId =
    route.params.serverId;

  const channelId =
    route.params.channelId;

  const otherUid =
    route.params.otherUid;

  const isChannel =
    !!serverId &&
    !!channelId;

  const pixContext =
    useMemo<
      PixPanelContext | null
    >(
      () => {
        if (
          isChannel &&
          serverId &&
          channelId
        ) {
          return {
            type: 'server',
            serverId,
            channelId,
          };
        }

        if (
          !isChannel &&
          otherUser
        ) {
          return {
            type: 'dm',
            conversationId:
              route.params.conversationId,
            target:
              otherUser,
          };
        }

        return null;
      },
      [
        isChannel,
        serverId,
        channelId,
        otherUser,
        route.params.conversationId,
      ],
    );

  const currentUid =
    auth.currentUser?.uid ??
    '';


  useEffect(() => {
    didInitialScrollRef.current =
      false;
  }, [
    route.params.conversationId,
    serverId,
    channelId,
  ]);

  useEffect(() => {
    if (
      isChannel ||
      !otherUid
    ) {
      return;
    }

    return listenToUserProfile(
      otherUid,
      setOtherUser,
    );
  }, [
    isChannel,
    otherUid,
  ]);

  useEffect(() => {
    if (
      isChannel
    ) {
      return;
    }

    const conversationId =
      route.params
        .conversationId;

    const unsubscribe =
      listenToMediaMessages(
        conversationId,

        incoming => {
          setDmMessages(
            incoming,
          );

          if (
            currentUid
          ) {
            markConversationRead(
              conversationId,
              currentUid,
            ).catch(
              () => {},
            );
          }
        },
      );

    return unsubscribe;
  }, [
    isChannel,
    route.params
      .conversationId,
    currentUid,
  ]);

  useEffect(() => {
    if (
      !serverId ||
      !channelId
    ) {
      return;
    }

    let cancelled =
      false;

    const unsubscribe =
      listenToMediaChannelMessages(
        serverId,
        channelId,

        async incoming => {
          if (
            cancelled
          ) {
            return;
          }

          setChannelMessages(
            incoming,
          );

          if (currentUid) {
            markServerChannelRead(
              currentUid,
              serverId,
              channelId,
            ).catch(
              () => {},
            );
          }

          const ids = [
            ...new Set(
              incoming
                .map(
                  message =>
                    message.senderId,
                )
                .filter(
                  Boolean,
                ),
            ),
          ];

          const profiles =
            await Promise.all(
              ids.map(
                async uid => [
                  uid,
                  await getUserById(
                    uid,
                  ),
                ] as const,
              ),
            );

          if (
            cancelled
          ) {
            return;
          }

          setAuthors(
            Object.fromEntries(
              profiles,
            ),
          );
        },
      );

    return () => {
      cancelled =
        true;

      unsubscribe();
    };
  }, [
    serverId,
    channelId,
    currentUid,
  ]);

  useEffect(() => {
    if (isChannel) {
      if (
        !serverId ||
        !channelId
      ) {
        setCallPresence(null);
        return;
      }

      return listenToChannelCallPresence(
        serverId,
        channelId,
        setCallPresence,
      );
    }

    return listenToDmCallPresence(
      route.params.conversationId,
      setCallPresence,
    );
  }, [
    isChannel,
    serverId,
    channelId,
    route.params.conversationId,
  ]);

  async function chooseImage() {
    if (sending) {
      return;
    }

    try {
      setMediaError('');

      const image =
        await pickSingleImage();

      if (image) {
        setSelectedImage(
          image,
        );
      }
    } catch (caught) {
      setMediaError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível escolher a imagem.',
      );
    }
  }

  function openCall(
    startWithVideo: boolean,
  ) {
    const title =
      isChannel
        ? route.params.name
        : otherUser?.username ||
          route.params.name;

    if (
      isChannel &&
      serverId &&
      channelId
    ) {
      navigation.navigate(
        'Call',
        {
          roomId:
            makeChannelCallRoomId(
              serverId,
              channelId,
            ),
          contextType:
            'server',
          serverId,
          channelId,
          title,
          startWithVideo,
        },
      );

      return;
    }

    navigation.navigate(
      'Call',
      {
        roomId:
          makeDmCallRoomId(
            route.params.conversationId,
          ),
        contextType:
          'dm',
        conversationId:
          route.params.conversationId,
        title,
        startWithVideo,
      },
    );
  }

  async function send() {
    const clean =
      text.trim();

    if (
      (!clean &&
        !selectedImage) ||
      sending ||
      !currentUid
    ) {
      return;
    }

    try {
      setSending(true);
      setMediaError('');

      if (
        isChannel &&
        serverId &&
        channelId &&
        !selectedImage &&
        /^\.(pagar|cobrar)\b/i.test(
          clean,
        )
      ) {
        const match =
          clean.match(
            /^\.(pagar|cobrar)\s+@([a-z0-9._]+)\s+(.+)$/i,
          );

        if (!match) {
          throw new Error(
            'Use .pagar @usuario 25,50 ou .cobrar @usuario 25,50.',
          );
        }

        const amountCents =
          parsePixAmount(
            match[3],
          );

        if (!amountCents) {
          throw new Error(
            'Digite um valor PIX válido.',
          );
        }

        const target =
          await getServerPixMemberByUsername(
            serverId,
            currentUid,
            match[2],
          );

        if (!target) {
          throw new Error(
            'Usuário não encontrado neste servidor.',
          );
        }

        await createPixRequest({
          initiatorId:
            currentUid,
          targetId:
            target.uid,
          action:
            match[1].toLowerCase() ===
            'pagar'
              ? 'pay'
              : 'charge',
          amountCents,
          contextType:
            'server',
          serverId,
          channelId,
        });

        setText('');
        setPixOpen(true);
        return;
      }

      if (selectedImage) {
        const uploaded =
          isChannel
            ? await uploadCommunityImage(
                currentUid,
                selectedImage,
              )
            : await uploadChatImage(
                currentUid,
                selectedImage,
              );

        if (
          isChannel &&
          serverId &&
          channelId
        ) {
          const messageId =
            await sendChannelMediaMessage(
            serverId,
            channelId,
            currentUid,
            clean,
            uploaded,
          );

          /* ELISEO_PUSH_AFTER_sendChannelMediaMessage */
          if (messageId) {
            void notifyServerMessage({
              serverId,
              channelId,
              messageId,
            });
          }
        } else {
          const messageId =
            await sendDmMediaMessage(
            route.params.conversationId,
            currentUid,
            clean,
            uploaded,
          );

          /* ELISEO_PUSH_AFTER_sendDmMediaMessage */
          if (messageId) {
            void notifyDmMessage({
              conversationId:
                route.params.conversationId,
              messageId,
            });
          }
        }

        setText('');
        setSelectedImage(null);
        return;
      }

      setText('');

      if (
        isChannel &&
        serverId &&
        channelId
      ) {
        const messageId =
            await sendChannelMessage(
          serverId,
          channelId,
          currentUid,
          clean,
        );

          /* ELISEO_PUSH_AFTER_sendChannelMessage */
          if (messageId) {
            void notifyServerMessage({
              serverId,
              channelId,
              messageId,
            });
          }

        return;
      }

      const messageId =
            await sendFirestoreMessage(
        route.params.conversationId,
        currentUid,
        clean,
      );

          /* ELISEO_PUSH_AFTER_sendFirestoreMessage */
          if (messageId) {
            void notifyDmMessage({
              conversationId:
                route.params.conversationId,
              messageId,
            });
          }
    } catch (caught) {
      setText(
        clean,
      );

      setMediaError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível enviar.',
      );
    } finally {
      setSending(false);
    }
  }

  const messages =
    isChannel
      ? channelMessages
      : dmMessages;


  function scrollToLatest(
    animated = false,
  ) {
    requestAnimationFrame(() => {
      messageListRef.current
        ?.scrollToEnd({
          animated,
        });
    });
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,

        {
          paddingTop:
            insets.top,
        },
      ]}
      behavior={
        Platform.OS ===
        'ios'
          ? 'padding'
          : 'height'
      }
    >
      <ScreenHeader
        title={
          isChannel
            ? route.params.name
            : otherUser
                ?.username ||
              route.params.name
        }
        subtitle={
          callPresence?.active
            ? `Em chamada · ${
                callPresence.participants.length
              } ${
                callPresence.participants.length === 1
                  ? 'participante'
                  : 'participantes'
              }`
            : isChannel
                ? 'Canal de texto'
                : 'Mensagem direta'
        }
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
          <View
            style={
              styles.headerActions
            }
          >
            <NativePressable
              haptic
              onPress={() =>
                openCall(false)
              }
              style={
                styles.miniAction
              }
            >
              <View
                style={[
                  styles.miniActionInner,
                  callPresence?.active &&
                    styles.miniActionActive,
                ]}
              >
                <Phone
                  size={18}
                  color={
                    callPresence?.active
                      ? colors.blue
                      : colors.textSoft
                  }
                />
              </View>
            </NativePressable>

            <NativePressable
              haptic
              onPress={() =>
                openCall(true)
              }
              style={
                styles.miniAction
              }
            >
              <View
                style={
                  styles.miniActionInner
                }
              >
                <Video
                  size={18}
                  color={
                    colors.textSoft
                  }
                />
              </View>
            </NativePressable>
          </View>
        }
      />

      <FlatList
        ref={
          messageListRef
        }
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (
            !didInitialScrollRef.current &&
            messages.length > 0
          ) {
            didInitialScrollRef.current =
              true;
            scrollToLatest(false);
          }
        }}
        data={
          messages
        }
        keyExtractor={
          item =>
            item.id
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.messages
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
              {isChannel
                ? 'Comece a conversa'
                : 'Envie a primeira mensagem'}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {isChannel
                ? 'Ainda não há mensagens neste canal.'
                : `Sua conversa com ${
                    otherUser
                      ?.username ||
                    route.params
                      .name
                  } começa aqui.`}
            </Text>
          </View>
        }
        renderItem={({
          item,
        }) => {
          const mine =
            item.senderId ===
            currentUid;

          const channelAuthor =
            isChannel
              ? authors[
                  item.senderId
                ]
              : null;

          const author =
            isChannel
              ? channelAuthor
              : mine
                  ? null
                  : otherUser;

          const authorName =
            mine
              ? 'Você'
              : author
                  ?.username ||
                route.params
                  .name;

          return (
            <Animated.View
              entering={
                FadeInUp.duration(
                  180,
                )
              }
              style={[
                styles.messageRow,

                mine &&
                  styles.messageRowMine,
              ]}
            >
              {!mine && (
                <Avatar
                  name={
                    authorName
                  }
                  uri={
                    author
                      ?.avatar
                  }
                  accent={
                    colors.purple
                  }
                  size={
                    32
                  }
                />
              )}

              <View
                style={[
                  styles.bubble,

                  mine
                    ? styles.bubbleMine
                    : styles.bubbleOther,
                ]}
              >
                {!mine && (
                  <Text
                    style={
                      styles.author
                    }
                  >
                    {authorName}
                  </Text>
                )}

                {!!item.text && (
                  <Text
                    style={
                      styles.messageText
                    }
                  >
                    {item.text}
                  </Text>
                )}

                {!!item.mediaUrl && (
                  <Image
                    source={{
                      uri:
                        item.mediaUrl,
                    }}
                    style={
                      styles.messageImage
                    }
                  />
                )}

                <Text
                  style={
                    styles.messageTime
                  }
                >
                  {formatTime(
                    item.createdAt,
                  )}
                </Text>
              </View>
            </Animated.View>
          );
        }}
      />

      <View
        style={[
          styles.composerWrap,

          {
            paddingBottom:
              Math.max(
                insets.bottom,
                8,
              ),
          },
        ]}
      >
        {!!selectedImage && (
          <View
            style={
              styles.pendingMedia
            }
          >
            <Image
              source={{
                uri:
                  selectedImage.uri,
              }}
              style={
                styles.pendingMediaImage
              }
            />

            <NativePressable
              haptic
              disabled={
                sending
              }
              onPress={() =>
                setSelectedImage(
                  null,
                )
              }
              style={
                styles.pendingMediaRemove
              }
            >
              <View
                style={
                  styles.pendingMediaRemoveInner
                }
              >
                <X
                  size={15}
                  color={
                    colors.white
                  }
                />
              </View>
            </NativePressable>
          </View>
        )}

        {!!mediaError && (
          <Text
            numberOfLines={2}
            style={
              styles.mediaError
            }
          >
            {mediaError}
          </Text>
        )}

        <View
          style={
            styles.composer
          }
        >
          <NativePressable
            haptic
            disabled={
              sending
            }
            onPress={() => {
              void chooseImage();
            }}
            style={
              styles.composeAction
            }
          >
            <View
              style={
                styles.composeActionInner
              }
            >
              <ImageIcon
                size={20}
                color={
                  colors.muted
                }
              />
            </View>
          </NativePressable>

          <NativePressable
            haptic
            disabled={
              sending ||
              !pixContext
            }
            onPress={() =>
              setPixOpen(true)
            }
            style={
              styles.composeAction
            }
          >
            <View
              style={[
                styles.composeActionInner,
                pixOpen &&
                  styles.composeActionActive,
              ]}
            >
              <CircleDollarSign
                size={20}
                color={
                  pixOpen
                    ? '#42A9FF'
                    : colors.muted
                }
              />
            </View>
          </NativePressable>

          <TextInput
            onFocus={() => {
              setTimeout(() => {
                scrollToLatest(true);
              }, 140);
            }}
            value={
              text
            }
            onChangeText={
              setText
            }
            placeholder={
              isChannel
                ? 'Mensagem no canal'
                : 'Mensagem'
            }
            placeholderTextColor={
              colors.faint
            }
            style={
              styles.input
            }
            multiline
            editable={
              !sending
            }
          />

          <NativePressable
            haptic
            disabled={
              sending ||
              (!text.trim() &&
                !selectedImage)
            }
            onPress={
              send
            }
            style={
              styles.send
            }
          >
            <View
              style={
                styles.sendInner
              }
            >
              <Send
                size={19}
                color={
                  colors.white
                }
              />
            </View>
          </NativePressable>
        </View>
      </View>

      {pixContext && (
        <PixPanel
          visible={
            pixOpen
          }
          onClose={() =>
            setPixOpen(false)
          }
          currentUid={
            currentUid
          }
          context={
            pixContext
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles =
  StyleSheet.create({
    root: {
      flex: 1,

      backgroundColor:
        'transparent',
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

      backgroundColor:
        colors.panel2,

      borderRadius:
        14,
    },

    headerActions: {
      flexDirection:
        'row',

      gap: 5,
    },

    miniAction: {
      width: 38,
      height: 38,
    },

    miniActionInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,
    },

    miniActionActive: {
      backgroundColor:
        'rgba(66,169,255,0.09)',
    },

    messages: {
      flexGrow: 1,

      justifyContent:
        'flex-end',

      paddingHorizontal:
        spacing.md,

      paddingVertical:
        16,

      gap: 8,
    },

    messageRow: {
      maxWidth:
        '86%',

      flexDirection:
        'row',

      alignItems:
        'flex-end',

      gap: 8,
    },

    messageRowMine: {
      alignSelf:
        'flex-end',

      justifyContent:
        'flex-end',
    },

    bubble: {
      maxWidth:
        '88%',

      paddingHorizontal:
        13,

      paddingTop:
        10,

      paddingBottom:
        7,

      borderRadius:
        17,
    },

    bubbleMine: {
      backgroundColor:
        colors.blue2,

      borderBottomRightRadius:
        6,
    },

    bubbleOther: {
      backgroundColor:
        colors.panel2,

      borderBottomLeftRadius:
        6,
    },

    author: {
      marginBottom: 4,

      color:
        colors.blue,

      fontSize: 10,

      fontWeight:
        '700',
    },

    messageText: {
      color:
        colors.text,

      fontSize: 14,

      lineHeight: 19,
    },

    messageImage: {
      width: 220,
      height: 220,

      maxWidth: '100%',

      marginTop: 7,

      backgroundColor:
        colors.panel3,

      borderRadius: 13,

      resizeMode: 'cover',
    },

    messageTime: {
      marginTop: 4,

      alignSelf:
        'flex-end',

      color:
        'rgba(238,242,251,0.55)',

      fontSize: 8,
    },

    empty: {
      flex: 1,

      justifyContent:
        'center',

      alignItems:
        'center',

      paddingVertical:
        60,

      paddingHorizontal:
        30,
    },

    emptyTitle: {
      color:
        colors.text,

      fontSize: 15,

      fontWeight:
        '700',
    },

    emptyText: {
      marginTop: 5,

      color:
        colors.faint,

      fontSize: 11,

      textAlign:
        'center',
    },

    composerWrap: {
      paddingHorizontal:
        10,

      paddingTop: 6,

      backgroundColor:
        'transparent',
    },

    pendingMedia: {
      position: 'relative',

      width: 112,
      height: 112,

      marginBottom: 7,
      marginLeft: 4,

      overflow: 'hidden',

      backgroundColor:
        colors.panel2,

      borderRadius: 15,
    },

    pendingMediaImage: {
      width: '100%',
      height: '100%',

      resizeMode: 'cover',
    },

    pendingMediaRemove: {
      position: 'absolute',

      top: 6,
      right: 6,

      width: 28,
      height: 28,
    },

    pendingMediaRemoveInner: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        'rgba(5,9,15,0.78)',

      borderRadius: 10,
    },

    mediaError: {
      marginBottom: 5,
      paddingHorizontal: 5,

      color: '#FF8798',

      fontSize: 9,
      lineHeight: 12,
    },

    composer: {
      minHeight: 58,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        6,

      backgroundColor:
        colors.panel2,

      borderRadius:
        radii.lg,
    },

    composeAction: {
      width: 40,
      height: 46,
    },

    composeActionInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 12,
    },

    composeActionActive: {
      backgroundColor:
        'rgba(66,169,255,0.09)',
    },

    input: {
      flex: 1,

      maxHeight: 110,

      color:
        colors.text,

      fontSize: 14,

      paddingHorizontal:
        8,

      paddingVertical:
        10,
    },

    send: {
      width: 43,
      height: 43,
    },

    sendInner: {
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
  });