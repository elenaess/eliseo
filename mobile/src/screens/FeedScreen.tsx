import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  FlatList,
  Image,
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
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react-native';

import Animated, {
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Avatar,
} from '../components/Avatar';

import {
  LogoMark,
} from '../components/LogoMark';

import {
  NativePressable,
} from '../components/NativePressable';

import {
  ServerRail,
} from '../components/ServerRail';

import {
  auth,
  EliseoServer,
  EliseoUser,
  getUserById,
  listenToUserProfile,
  listenToUserServers,
} from '../services/firebase';

import {
  createComment,
  deletePost,
  EliseoComment,
  EliseoPost,
  listenToComments,
  listenToPostLikes,
  listenToRepostCount,
  repostPost,
  togglePostLike,
} from '../services/feed';

import {
  createPostWithMedia,
  listenToMediaPosts,
  pickSingleImage,
} from '../services/media';

import {
  uploadPostImage,
} from '../services/storage';

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
      'Feed'
    >,
    NativeStackScreenProps<
      RootStackParamList
    >
  >;

type HydratedPost =
  EliseoPost & {
    author:
      EliseoUser | null;

    originalAuthor:
      EliseoUser | null;

    imageUrl?: string;
    imageKey?: string;
  };

type HydratedComment =
  EliseoComment & {
    author:
      EliseoUser | null;
  };

type FeedMode =
  | 'for-you'
  | 'recommended'
  | 'trending';

type PostEngagement = {
  likes: number;
  comments: number;
};

/* =========================================================
   TEMPO
   ========================================================= */

function formatTime(
  timestamp: any,
) {
  const date =
    timestamp
      ?.toDate?.();

  if (!date) {
    return 'Agora';
  }

  const today =
    new Date();

  if (
    date.toDateString() ===
    today.toDateString()
  ) {
    return `Hoje às ${date.toLocaleTimeString(
      'pt-BR',
      {
        hour:
          '2-digit',

        minute:
          '2-digit',
      },
    )}`;
  }

  return date.toLocaleDateString(
    'pt-BR',
    {
      day:
        '2-digit',

      month:
        'short',
    },
  );
}

/* =========================================================
   POST
   ========================================================= */

function FeedPost({
  post,
  currentUid,
}: {
  post:
    HydratedPost;

  currentUid:
    string;
}) {
  const [
    likes,
    setLikes,
  ] =
    useState(0);

  const [
    liked,
    setLiked,
  ] =
    useState(false);

  const [
    repostCount,
    setRepostCount,
  ] =
    useState(0);

  const [
    comments,
    setComments,
  ] =
    useState<
      HydratedComment[]
    >([]);

  const [
    commentsOpen,
    setCommentsOpen,
  ] =
    useState(false);

  const [
    comment,
    setComment,
  ] =
    useState('');

  const [
    commenting,
    setCommenting,
  ] =
    useState(false);

  const [
    reposting,
    setReposting,
  ] =
    useState(false);

  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);

  useEffect(() => {
    if (
      !currentUid
    ) {
      return;
    }

    return listenToPostLikes(
      post.id,
      currentUid,

      (
        count,
        mine,
      ) => {
        setLikes(
          count,
        );

        setLiked(
          mine,
        );
      },
    );
  }, [
    post.id,
    currentUid,
  ]);

  useEffect(() => {
    const originalId =
      post.repostOf ||
      post.id;

    return listenToRepostCount(
      originalId,
      setRepostCount,
    );
  }, [
    post.id,
    post.repostOf,
  ]);

  useEffect(() => {
    let alive =
      true;

    const unsubscribe =
      listenToComments(
        post.id,

        async incoming => {
          const hydrated =
            await Promise.all(
              incoming.map(
                async item => ({
                  ...item,

                  author:
                    await getUserById(
                      item.authorId,
                    ),
                }),
              ),
            );

          if (
            alive
          ) {
            setComments(
              hydrated,
            );
          }
        },
      );

    return () => {
      alive =
        false;

      unsubscribe();
    };
  }, [
    post.id,
  ]);

  const visibleAuthor =
    post.repostOf
      ? post.originalAuthor ||
        post.author
      : post.author;

  async function sendComment() {
    const clean =
      comment.trim();

    if (
      !clean ||
      !currentUid ||
      commenting
    ) {
      return;
    }

    try {
      setCommenting(
        true,
      );

      await createComment(
        post.id,
        currentUid,
        clean,
      );

      setComment('');
    } finally {
      setCommenting(
        false,
      );
    }
  }

  async function handleRepost() {
    if (
      !currentUid ||
      reposting
    ) {
      return;
    }

    try {
      setReposting(
        true,
      );

      await repostPost(
        post,
        currentUid,
      );
    } finally {
      setReposting(
        false,
      );
    }
  }

  function removePost() {
    Alert.alert(
      'Excluir publicação',
      'Deseja excluir esta publicação?',

      [
        {
          text:
            'Cancelar',

          style:
            'cancel',
        },

        {
          text:
            'Excluir',

          style:
            'destructive',

          onPress:
            async () => {
              await deletePost(
                post.id,
                currentUid,
              );
            },
        },
      ],
    );
  }

  return (
    <Animated.View
      layout={
        Layout.springify()
      }
      style={
        styles.post
      }
    >
      {post.repostOf && (
        <View
          style={
            styles.repostLabel
          }
        >
          <Repeat2
            size={13}
            color={
              colors.muted
            }
          />

          <Text
            style={
              styles.repostText
            }
          >
            {post.author
              ?.username ||
              'Alguém'}{' '}
            republicou
          </Text>
        </View>
      )}

      <View
        style={
          styles.postHeader
        }
      >
        <Avatar
          name={
            visibleAuthor
              ?.username ||
            'Usuário'
          }
          uri={
            visibleAuthor
              ?.avatar
          }
          accent={
            colors.blue2
          }
          size={
            44
          }
        />

        <View
          style={
            styles.postIdentity
          }
        >
          <Text
            style={
              styles.name
            }
          >
            {visibleAuthor
              ?.username ||
              'Usuário'}
          </Text>

          <Text
            style={
              styles.meta
            }
          >
            {formatTime(
              post.createdAt,
            )}
          </Text>
        </View>

        <NativePressable
          onPress={() =>
            setMenuOpen(
              current =>
                !current,
            )
          }
          style={
            styles.more
          }
        >
          <View
            style={
              styles.moreInner
            }
          >
            <MoreHorizontal
              size={20}
              color={
                colors.muted
              }
            />
          </View>
        </NativePressable>
      </View>

      {menuOpen &&
        post.authorId ===
          currentUid && (
          <NativePressable
            haptic
            onPress={
              removePost
            }
            style={
              styles.deleteButton
            }
          >
            <View
              style={
                styles.deleteInner
              }
            >
              <Trash2
                size={15}
                color="#FF6683"
              />

              <Text
                style={
                  styles.deleteText
                }
              >
                Excluir publicação
              </Text>
            </View>
          </NativePressable>
        )}

      <Text
        style={
          styles.postText
        }
      >
        {post.text}
      </Text>

      {!!post.imageUrl && (
        <Image
          source={{
            uri:
              post.imageUrl,
          }}
          style={
            styles.postImage
          }
          resizeMode="cover"
        />
      )}

      <View
        style={
          styles.actions
        }
      >
        <NativePressable
          haptic
          disabled={
            !currentUid
          }
          onPress={() => {
            if (
              !currentUid
            ) {
              return;
            }

            togglePostLike(
              post.id,
              currentUid,
            );
          }}
          style={
            styles.actionButton
          }
        >
          <View
            style={
              styles.actionInner
            }
          >
            <Heart
              size={19}
              color={
                liked
                  ? '#FF6683'
                  : colors.muted
              }
              fill={
                liked
                  ? '#FF6683'
                  : 'transparent'
              }
            />

            <Text
              style={[
                styles.actionText,

                liked &&
                  styles.actionLiked,
              ]}
            >
              {likes}
            </Text>
          </View>
        </NativePressable>

        <NativePressable
          haptic
          onPress={() =>
            setCommentsOpen(
              current =>
                !current,
            )
          }
          style={
            styles.actionButton
          }
        >
          <View
            style={
              styles.actionInner
            }
          >
            <MessageCircle
              size={19}
              color={
                colors.muted
              }
            />

            <Text
              style={
                styles.actionText
              }
            >
              {comments.length}
            </Text>
          </View>
        </NativePressable>

        <NativePressable
          haptic
          disabled={
            reposting ||
            !currentUid
          }
          onPress={
            handleRepost
          }
          style={
            styles.actionButton
          }
        >
          <View
            style={
              styles.actionInner
            }
          >
            <Repeat2
              size={19}
              color={
                colors.muted
              }
            />

            {repostCount >
              0 && (
              <Text
                style={
                  styles.actionText
                }
              >
                {repostCount}
              </Text>
            )}
          </View>
        </NativePressable>
      </View>

      {commentsOpen && (
        <View
          style={
            styles.comments
          }
        >
          {comments.map(
            item => (
              <View
                key={
                  item.id
                }
                style={
                  styles.comment
                }
              >
                <Avatar
                  name={
                    item.author
                      ?.username ||
                    'Usuário'
                  }
                  uri={
                    item.author
                      ?.avatar
                  }
                  accent={
                    colors.purple
                  }
                  size={
                    30
                  }
                />

                <View
                  style={
                    styles.commentBody
                  }
                >
                  <Text
                    style={
                      styles.commentAuthor
                    }
                  >
                    {item.author
                      ?.username ||
                      'Usuário'}
                  </Text>

                  <Text
                    style={
                      styles.commentText
                    }
                  >
                    {item.text}
                  </Text>
                </View>
              </View>
            ),
          )}

          <View
            style={
              styles.commentComposer
            }
          >
            <TextInput
              value={
                comment
              }
              onChangeText={
                setComment
              }
              placeholder="Escreva um comentário..."
              placeholderTextColor={
                colors.faint
              }
              style={
                styles.commentInput
              }
              multiline
              editable={
                !commenting
              }
            />

            <NativePressable
              haptic
              disabled={
                commenting ||
                !comment.trim()
              }
              onPress={
                sendComment
              }
              style={
                styles.commentSend
              }
            >
              <View
                style={
                  styles.commentSendInner
                }
              >
                <Send
                  size={16}
                  color={
                    colors.white
                  }
                />
              </View>
            </NativePressable>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

/* =========================================================
   FEED
   ========================================================= */

export function FeedScreen({
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
    profile,
    setProfile,
  ] =
    useState<
      EliseoUser | null
    >(null);

  const [
    posts,
    setPosts,
  ] =
    useState<
      HydratedPost[]
    >([]);

  const [
    text,
    setText,
  ] =
    useState('');

  const [
    publishing,
    setPublishing,
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
    feedMode,
    setFeedMode,
  ] =
    useState<FeedMode>(
      'for-you',
    );

  const [
    engagement,
    setEngagement,
  ] =
    useState<
      Record<
        string,
        PostEngagement
      >
    >({});

  const currentUid =
    auth.currentUser
      ?.uid || '';

  useEffect(() => {
    if (
      !currentUid
    ) {
      return;
    }

    return listenToUserServers(
      currentUid,
      setServers,
    );
  }, [
    currentUid,
  ]);

  useEffect(() => {
    if (
      !currentUid
    ) {
      return;
    }

    return listenToUserProfile(
      currentUid,
      setProfile,
    );
  }, [
    currentUid,
  ]);

  useEffect(() => {
    let alive =
      true;

    const unsubscribe =
      listenToMediaPosts(
        async incoming => {
          const hydrated =
            await Promise.all(
              incoming.map(
                async post => {
                  const author =
                    await getUserById(
                      post.authorId,
                    );

                  const originalAuthor =
                    post.repostAuthorId
                      ? await getUserById(
                          post.repostAuthorId,
                        )
                      : null;

                  return {
                    ...post,

                    author,

                    originalAuthor,
                  };
                },
              ),
            );

          if (
            alive
          ) {
            setPosts(
              hydrated,
            );
          }
        },
      );

    return () => {
      alive =
        false;

      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      !currentUid ||
      posts.length === 0
    ) {
      setEngagement({});
      return;
    }

    const activeIds =
      new Set(
        posts.map(
          post =>
            post.id,
        ),
      );

    setEngagement(
      current => {
        const next:
          Record<
            string,
            PostEngagement
          > = {};

        posts.forEach(
          post => {
            next[post.id] =
              current[
                post.id
              ] || {
                likes: 0,
                comments: 0,
              };
          },
        );

        return next;
      },
    );

    const unsubscribers:
      Array<() => void> =
        [];

    posts.forEach(post => {
      const stopLikes =
        listenToPostLikes(
          post.id,
          currentUid,
          count => {
            if (
              !activeIds.has(
                post.id,
              )
            ) {
              return;
            }

            setEngagement(
              current => ({
                ...current,
                [post.id]: {
                  likes:
                    count,
                  comments:
                    current[
                      post.id
                    ]
                      ?.comments ||
                    0,
                },
              }),
            );
          },
        );

      const stopComments =
        listenToComments(
          post.id,
          incoming => {
            if (
              !activeIds.has(
                post.id,
              )
            ) {
              return;
            }

            setEngagement(
              current => ({
                ...current,
                [post.id]: {
                  likes:
                    current[
                      post.id
                    ]?.likes ||
                    0,
                  comments:
                    incoming.length,
                },
              }),
            );
          },
        );

      unsubscribers.push(
        stopLikes,
        stopComments,
      );
    });

    return () => {
      activeIds.clear();

      unsubscribers.forEach(
        unsubscribe =>
          unsubscribe(),
      );
    };
  }, [
    currentUid,
    posts,
  ]);

  const visiblePosts =
    useMemo(
      () => {
        const clean =
          search
            .trim()
            .toLowerCase();

        const filtered =
          !clean
            ? posts
            : posts.filter(
                post =>
                  post.text
                    .toLowerCase()
                    .includes(
                      clean,
                    ) ||
                  post.author
                    ?.username
                    .toLowerCase()
                    .includes(
                      clean,
                    ) ||
                  post.originalAuthor
                    ?.username
                    .toLowerCase()
                    .includes(
                      clean,
                    ),
              );

        // Recomendados foi pedido igual ao Para você.
        if (
          feedMode !==
          'trending'
        ) {
          return filtered;
        }

        return [
          ...filtered,
        ].sort(
          (a, b) => {
            const aStats =
              engagement[
                a.id
              ];

            const bStats =
              engagement[
                b.id
              ];

            const aScore =
              (aStats
                ?.likes ||
                0) +
              (aStats
                ?.comments ||
                0);

            const bScore =
              (bStats
                ?.likes ||
                0) +
              (bStats
                ?.comments ||
                0);

            if (
              bScore !==
              aScore
            ) {
              return (
                bScore -
                aScore
              );
            }

            const aTime =
              a.createdAt
                ?.toMillis?.() ||
              0;

            const bTime =
              b.createdAt
                ?.toMillis?.() ||
              0;

            return (
              bTime -
              aTime
            );
          },
        );
      },

      [
        posts,
        search,
        feedMode,
        engagement,
      ],
    );

  async function chooseImage() {
    if (publishing) {
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

  async function publish() {
    const clean =
      text.trim();

    if (
      (!clean &&
        !selectedImage) ||
      !currentUid ||
      publishing
    ) {
      return;
    }

    try {
      setPublishing(
        true,
      );
      setMediaError('');

      const uploaded =
        selectedImage
          ? await uploadPostImage(
              currentUid,
              selectedImage,
            )
          : null;

      await createPostWithMedia(
        currentUid,
        clean,
        uploaded,
      );

      setText('');
      setSelectedImage(null);
    } catch (caught) {
      setMediaError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível publicar.',
      );
    } finally {
      setPublishing(
        false,
      );
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
      {/* ===================================================
          HEADER
          =================================================== */}

      <View
        style={
          styles.top
        }
      >
        <LogoMark
          size={46}
        />

        <View
          style={
            styles.topSpacer
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
            styles.topButton
          }
        >
          <View
            style={
              styles.topButtonInner
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

      {/* ===================================================
          SERVIDORES

          Wrapper com altura própria para impedir que
          as tabs subam por cima do ServerRail.
          =================================================== */}

      <View
        style={
          styles.serverRailArea
        }
      >
        <ServerRail
          servers={
            servers
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
          onCreateServer={() =>
            navigation.navigate(
              'Communities',
            )
          }
        />
      </View>

      {/* ===================================================
          TABS - SEMPRE ABAIXO DOS SERVIDORES
          =================================================== */}

      <View
        style={
          styles.tabs
        }
      >
        <NativePressable
          haptic
          onPress={() =>
            setFeedMode(
              'for-you',
            )
          }
          style={
            styles.tabButton
          }
        >
          <View
            style={
              styles.tabButtonInner
            }
          >
            <Text
              style={[
                styles.tab,
                feedMode ===
                  'for-you' &&
                  styles.activeTab,
              ]}
            >
              Para você
            </Text>
          </View>
        </NativePressable>

        <NativePressable
          haptic
          onPress={() =>
            setFeedMode(
              'recommended',
            )
          }
          style={
            styles.tabButton
          }
        >
          <View
            style={
              styles.tabButtonInner
            }
          >
            <Text
              style={[
                styles.tab,
                feedMode ===
                  'recommended' &&
                  styles.activeTab,
              ]}
            >
              Recomendados
            </Text>
          </View>
        </NativePressable>

        <NativePressable
          haptic
          onPress={() =>
            setFeedMode(
              'trending',
            )
          }
          style={
            styles.tabButton
          }
        >
          <View
            style={
              styles.tabButtonInner
            }
          >
            <Text
              style={[
                styles.tab,
                feedMode ===
                  'trending' &&
                  styles.activeTab,
              ]}
            >
              Em alta
            </Text>
          </View>
        </NativePressable>
      </View>

      {/* ===================================================
          FEED
          =================================================== */}

      <FlatList
        data={
          visiblePosts
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
        ItemSeparatorComponent={() => (
          <View
            style={
              styles.separator
            }
          />
        )}
        ListHeaderComponent={
          <View>
            {searchOpen && (
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
                  placeholder="Buscar posts"
                  placeholderTextColor={
                    colors.faint
                  }
                  style={
                    styles.searchInput
                  }
                  autoFocus
                  autoCorrect={
                    false
                  }
                />
              </View>
            )}

            <View
              style={
                styles.composer
              }
            >
              <View
                style={
                  styles.composerTop
                }
              >
                <Avatar
                  name={
                    profile
                      ?.username ||
                    'E'
                  }
                  uri={
                    profile
                      ?.avatar
                  }
                  accent={
                    colors.blue2
                  }
                  size={
                    39
                  }
                />

                <TextInput
                  value={
                    text
                  }
                  onChangeText={
                    setText
                  }
                  placeholder="Compartilhe algo com o Elíseo..."
                  placeholderTextColor={
                    colors.muted
                  }
                  style={
                    styles.composerInput
                  }
                  multiline
                  maxLength={
                    500
                  }
                  editable={
                    !publishing
                  }
                />

                <NativePressable
                  haptic
                  disabled={
                    publishing
                  }
                  onPress={() => {
                    void chooseImage();
                  }}
                  style={
                    styles.mediaButton
                  }
                >
                  <View
                    style={
                      styles.mediaButtonInner
                    }
                  >
                    <ImageIcon
                      size={18}
                      color={
                        selectedImage
                          ? colors.blue
                          : colors.muted
                      }
                    />
                  </View>
                </NativePressable>

                <NativePressable
                  haptic
                  disabled={
                    publishing ||
                    (!text.trim() &&
                      !selectedImage)
                  }
                  onPress={
                    publish
                  }
                  style={
                    styles.publishButton
                  }
                >
                  <View
                    style={[
                      styles.publishInner,

                      !text.trim() &&
                        !selectedImage &&
                        styles.publishDisabled,
                    ]}
                  >
                    <Send
                      size={18}
                      color={
                        colors.white
                      }
                    />
                  </View>
                </NativePressable>
              </View>

              {!!selectedImage && (
                <View
                  style={
                    styles.mediaPreview
                  }
                >
                  <Image
                    source={{
                      uri:
                        selectedImage.uri,
                    }}
                    style={
                      styles.mediaPreviewImage
                    }
                  />

                  <NativePressable
                    haptic
                    disabled={
                      publishing
                    }
                    onPress={() =>
                      setSelectedImage(
                        null,
                      )
                    }
                    style={
                      styles.mediaRemove
                    }
                  >
                    <View
                      style={
                        styles.mediaRemoveInner
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

              <View
                style={
                  styles.composerBottom
                }
              >
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

                {!!text && (
                  <Text
                    style={
                      styles.counter
                    }
                  >
                    {text.length}/500
                  </Text>
                )}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View
            style={
              styles.empty
            }
          >
            <MessageCircle
              size={30}
              color={
                colors.faint
              }
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              Nenhuma publicação encontrada
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              O feed está esperando alguma coisa interessante.
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
                220,
              )
              .delay(
                index *
                  30,
              )}
          >
            <FeedPost
              post={
                item
              }
              currentUid={
                currentUid
              }
            />
          </Animated.View>
        )}
      />
    </View>
  );
}

/* =========================================================
   ESTILOS
   ========================================================= */

const styles =
  StyleSheet.create({
    root: {
      flex: 1,

      backgroundColor:
        'transparent',
    },

    /* HEADER */

    top: {
      height: 64,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.lg,
    },

    topSpacer: {
      flex: 1,
    },

    topButton: {
      width: 40,
      height: 40,
    },

    topButtonInner: {
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

    /* SERVIDORES */

    serverRailArea: {
      height: 64,

      flexShrink: 0,

      justifyContent:
        'center',

      marginBottom: 4,
    },

    /* TABS */

    tabs: {
      height: 44,

      flexShrink: 0,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 20,

      paddingHorizontal:
        spacing.lg,

      marginBottom: 4,
    },

    tabButton: {
      height: 44,
    },

    tabButtonInner: {
      flex: 1,

      justifyContent:
        'center',
    },

    tab: {
      color:
        colors.faint,

      fontSize: 12,

      fontWeight:
        '600',
    },

    activeTab: {
      color:
        colors.blue,
    },

    /* LISTA */

    list: {
      paddingHorizontal:
        spacing.md,

      paddingBottom:
        28,

      flexGrow: 1,
    },

    /* BUSCA */

    searchBox: {
      height: 48,

      marginBottom: 8,

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
        radii.md,
    },

    searchInput: {
      flex: 1,

      color:
        colors.text,

      fontSize: 13,
    },

    /* COMPOSER */

    composer: {
      minHeight: 72,

      marginBottom: 8,

      padding: 11,

      backgroundColor:
        colors.panel2,

      borderRadius:
        radii.lg,
    },

    composerTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 10,
    },

    composerInput: {
      flex: 1,

      maxHeight: 110,

      color:
        colors.text,

      fontSize: 13,

      lineHeight: 18,

      paddingVertical: 8,
    },

    mediaButton: {
      width: 38,
      height: 38,
    },

    mediaButtonInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.panel3,

      borderRadius: 12,
    },

    mediaPreview: {
      position: 'relative',

      width: 118,
      height: 118,

      marginTop: 10,
      marginLeft: 49,

      overflow: 'hidden',

      backgroundColor:
        colors.panel3,

      borderRadius: 15,
    },

    mediaPreviewImage: {
      width: '100%',
      height: '100%',

      resizeMode: 'cover',
    },

    mediaRemove: {
      position: 'absolute',

      top: 6,
      right: 6,

      width: 28,
      height: 28,
    },

    mediaRemoveInner: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        'rgba(5,9,15,0.78)',

      borderRadius: 10,
    },

    composerBottom: {
      minHeight: 14,

      marginTop: 5,

      flexDirection: 'row',
      alignItems: 'flex-end',
    },

    mediaError: {
      flex: 1,

      color: '#FF8798',

      fontSize: 9,
      lineHeight: 12,
    },

    publishButton: {
      width: 38,
      height: 38,
    },

    publishInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        12,

      backgroundColor:
        colors.blue2,
    },

    publishDisabled: {
      opacity: 0.35,
    },

    counter: {
      marginLeft: 'auto',

      marginRight: 3,

      alignSelf:
        'flex-end',

      color:
        colors.faint,

      fontSize: 9,
    },

    separator: {
      height: 7,
    },

    /* POST */

    post: {
      padding: 15,

      backgroundColor:
        colors.panel,

      borderRadius:
        radii.lg,
    },

    repostLabel: {
      marginBottom: 10,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,

      paddingLeft: 4,
    },

    repostText: {
      color:
        colors.muted,

      fontSize: 10,

      fontWeight:
        '600',
    },

    postHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    postIdentity: {
      flex: 1,

      marginLeft: 11,
    },

    name: {
      color:
        colors.text,

      fontSize: 14,

      fontWeight:
        '700',
    },

    meta: {
      marginTop: 2,

      color:
        colors.faint,

      fontSize: 9,
    },

    more: {
      width: 36,
      height: 36,
    },

    moreInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    deleteButton: {
      height: 38,

      marginTop: 8,

      alignSelf:
        'flex-end',
    },

    deleteInner: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,

      paddingHorizontal:
        11,

      borderRadius:
        11,

      backgroundColor:
        'rgba(255,102,131,0.08)',
    },

    deleteText: {
      color:
        '#FF6683',

      fontSize: 10,

      fontWeight:
        '600',
    },

    postText: {
      marginTop: 13,

      color:
        colors.textSoft,

      fontSize: 14,

      lineHeight: 20,
    },

    postImage: {
      width: '100%',

      aspectRatio: 1.5,

      marginTop: 12,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.panel2,
    },

    /* AÇÕES */

    actions: {
      marginTop: 13,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 4,
    },

    actionButton: {
      minWidth: 54,

      height: 38,
    },

    actionInner: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,

      paddingHorizontal:
        8,

      borderRadius:
        12,
    },

    actionText: {
      color:
        colors.muted,

      fontSize: 11,

      fontWeight:
        '600',
    },

    actionLiked: {
      color:
        '#FF6683',
    },

    /* COMENTÁRIOS */

    comments: {
      marginTop: 12,

      paddingTop: 11,

      borderTopWidth: 1,

      borderTopColor:
        'rgba(255,255,255,0.05)',

      gap: 10,
    },

    comment: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap: 9,
    },

    commentBody: {
      flex: 1,

      paddingHorizontal:
        10,

      paddingVertical:
        8,

      backgroundColor:
        colors.panel2,

      borderRadius:
        12,
    },

    commentAuthor: {
      color:
        colors.text,

      fontSize: 10,

      fontWeight:
        '700',
    },

    commentText: {
      marginTop: 3,

      color:
        colors.textSoft,

      fontSize: 12,

      lineHeight: 17,
    },

    commentComposer: {
      minHeight: 44,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,

      marginTop: 3,
    },

    commentInput: {
      flex: 1,

      minHeight: 42,
      maxHeight: 90,

      paddingHorizontal:
        12,

      paddingVertical:
        8,

      color:
        colors.text,

      backgroundColor:
        colors.panel2,

      borderRadius:
        12,

      fontSize: 11,
    },

    commentSend: {
      width: 40,
      height: 40,
    },

    commentSendInner: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.blue2,

      borderRadius:
        12,
    },

    /* VAZIO */

    empty: {
      paddingVertical: 60,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    emptyTitle: {
      marginTop: 10,

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

      textAlign:
        'center',
    },
  });