import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  User as FirebaseUser,
} from "firebase/auth";

import {
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Search,
  Send,
  Share2,
  VolumeX,
  X,
} from "lucide-react";

import {
  createComment,
  createPost,
  deletePost,
  getUserById,
  listenToComments,
  listenToPostLikes,
  listenToPosts,
  listenToRepostCount,
  repostPost,
  togglePostLike,
  type EliseoComment,
  type EliseoMedia,
  type EliseoPost,
  type EliseoUser,
} from "./firestore";

import {
  deleteStoredFile,
  uploadGif,
  uploadPostImage,
} from "./storage";

import "./Feed.css";


type FeedProps = {
  user: FirebaseUser;

  profile:
    EliseoUser | null;

  onMessageUser:
    (
      user:
        EliseoUser
    ) => void;

  onNavigate?: (
    page:
      | "profile"
      | "customize"
      | "messages"
  ) => void;
};


type HydratedPost =
  EliseoPost & {
    author:
      EliseoUser | null;

    originalAuthor:
      EliseoUser | null;

    imageUrl?: string;
  };


type HydratedComment =
  EliseoComment & {
    author:
      EliseoUser | null;
  };


function avatarLetter(
  user:
    EliseoUser | null
) {
  return (
    user?.username
      ?.charAt(0)
      .toUpperCase() ||
    "E"
  );
}


function Avatar({
  user,
  small = false,
}: {
  user:
    EliseoUser | null;

  small?: boolean;
}) {
  return (
    <div
      className={`el-feed-avatar ${
        small
          ? "small"
          : ""
      }`}
    >
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt=""
        />
      ) : (
        avatarLetter(user)
      )}
    </div>
  );
}


function formatPostTime(
  timestamp: any
) {
  if (
    !timestamp?.toDate
  ) {
    return "Agora";
  }

  const date =
    timestamp.toDate();

  const today =
    new Date();

  if (
    date.toDateString() ===
    today.toDateString()
  ) {
    return `Hoje às ${date.toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`;
  }

  return date.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "short",
    }
  );
}


/* =========================================================
   SIDEBAR DO FEED
   ========================================================= */



/* =========================================================
   POST
   ========================================================= */

function FeedPost({
  post,
  user,
}: {
  post:
    HydratedPost;

  user:
    FirebaseUser;
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
    useState("");


  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);


  const originalPostId =
    post.repostOf ||
    post.id;


  useEffect(() => {
    return listenToPostLikes(
      post.id,
      user.uid,
      (
        count,
        mine
      ) => {
        setLikes(count);
        setLiked(mine);
      }
    );
  }, [
    post.id,
    user.uid,
  ]);


  useEffect(() => {
    return listenToRepostCount(
      originalPostId,
      setRepostCount
    );
  }, [
    originalPostId,
  ]);


  useEffect(() => {
    return listenToComments(
      post.id,

      async (
        incoming
      ) => {
        const result =
          await Promise.all(
            incoming.map(
              async (
                item
              ) => ({
                ...item,

                author:
                  await getUserById(
                    item.authorId
                  ),
              })
            )
          );

        setComments(
          result
        );
      }
    );
  }, [
    post.id,
  ]);


  const visibleAuthor =
    post.repostOf
      ? post.originalAuthor
      : post.author;


  async function sendComment() {
    const text =
      comment.trim();

    if (!text) {
      return;
    }

    await createComment(
      post.id,
      user.uid,
      text
    );

    setComment("");

    setCommentsOpen(
      true
    );
  }


  async function removePost() {
    if (
      post.authorId !==
      user.uid
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Excluir esta publicação?"
      );

    if (!confirmed) {
      return;
    }

    await deletePost(
      post.id,
      user.uid
    );
  }


  return (
    <article className="el-feed-post">

      {post.repostOf && (
        <div className="el-feed-reposted">

          <Repeat2 size={14} />

          <span>
            {post.author
              ?.username ||
              "Alguém"}{" "}
            republicou
          </span>

        </div>
      )}


      <header className="el-feed-post-header">

        <Avatar
          user={visibleAuthor}
        />


        <div className="el-feed-author">

          <strong>
            {visibleAuthor
              ?.username ||
              "Usuário"}

            <span className="el-feed-star">
              ✦
            </span>
          </strong>


          <span>
            {formatPostTime(
              post.createdAt
            )}
          </span>

        </div>


        <div className="el-feed-post-menu-wrap">

          <button
            className="el-feed-more"
            onClick={() =>
              setMenuOpen(
                !menuOpen
              )
            }
          >
            <MoreHorizontal
              size={21}
            />
          </button>


          {menuOpen &&
            post.authorId ===
              user.uid && (

            <div className="el-feed-dropdown">

              <button
                onClick={
                  removePost
                }
              >
                Excluir publicação
              </button>

            </div>

          )}

        </div>

      </header>


      <div className="el-feed-post-body">

        {post.text && (
          <p>
            {post.text}
          </p>
        )}


        {(post.mediaUrl || post.imageUrl) && (
          <div className="el-feed-post-media">

            <img
              src={
                post.mediaUrl ||
                post.imageUrl
              }
              alt={
                post.mediaType === "gif"
                  ? "GIF da publicação"
                  : "Imagem da publicação"
              }
            />

          </div>
        )}

      </div>


      <footer className="el-feed-post-actions">

        <button
          className={
            liked
              ? "liked"
              : ""
          }
          onClick={() =>
            togglePostLike(
              post.id,
              user.uid
            )
          }
        >
          <Heart
            size={21}
            fill={
              liked
                ? "currentColor"
                : "none"
            }
          />

          <span>
            {likes}
          </span>
        </button>


        <button
          onClick={() =>
            setCommentsOpen(
              !commentsOpen
            )
          }
        >
          <MessageCircle
            size={21}
          />

          <span>
            {comments.length}
          </span>
        </button>


        <button
          onClick={() =>
            repostPost(
              post,
              user.uid
            )
          }
        >
          <Repeat2
            size={21}
          />

          {repostCount >
            0 && (
            <span>
              {repostCount}
            </span>
          )}
        </button>


        <button
          title="Compartilhar em breve"
        >
          <Share2 size={21} />
        </button>

      </footer>


      {commentsOpen && (
        <section className="el-feed-comments">

          {comments.map(
            (
              item
            ) => (
              <div
                className="el-feed-comment"
                key={
                  item.id
                }
              >
                <Avatar
                  user={
                    item.author
                  }
                  small
                />

                <div>
                  <strong>
                    {item.author
                      ?.username ||
                      "Usuário"}
                  </strong>

                  <p>
                    {item.text}
                  </p>
                </div>
              </div>
            )
          )}


          <div className="el-feed-comment-input">

            <input
              value={comment}
              onChange={(e) =>
                setComment(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  sendComment();
                }
              }}
              placeholder="Escrever uma resposta..."
            />

            <button
              onClick={
                sendComment
              }
            >
              <Send size={17} />
            </button>

          </div>

        </section>
      )}

    </article>
  );
}


/* =========================================================
   FEED
   ========================================================= */

function Feed({
  user,
  profile,
  onMessageUser: _onMessageUser,
}: FeedProps) {
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
    useState("");


  const [
    tab,
    setTab,
  ] =
    useState<
      | "for-you"
      | "recommended"
      | "trending"
    >("for-you");


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    publishing,
    setPublishing,
  ] =
    useState(false);


  const [
    mediaFile,
    setMediaFile,
  ] =
    useState<File | null>(
      null
    );


  const [
    mediaPreview,
    setMediaPreview,
  ] =
    useState("");


  const [
    mediaError,
    setMediaError,
  ] =
    useState("");


  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  useEffect(() => {
    return () => {
      if (mediaPreview) {
        URL.revokeObjectURL(
          mediaPreview
        );
      }
    };
  }, [mediaPreview]);


  useEffect(() => {
    return listenToPosts(
      async (
        rawPosts
      ) => {
        const hydrated =
          await Promise.all(
            rawPosts.map(
              async (
                post
              ) => {
                const author =
                  await getUserById(
                    post.authorId
                  );

                const originalAuthor =
                  post.repostAuthorId
                    ? await getUserById(
                        post.repostAuthorId
                      )
                    : null;

                return {
                  ...post,

                  author,

                  originalAuthor,

                  imageUrl:
                    (
                      post as any
                    ).imageUrl ||
                    "",
                };
              }
            )
          );

        setPosts(
          hydrated
        );
      }
    );
  }, []);


  const visiblePosts =
    useMemo(() => {
      const clean =
        search
          .trim()
          .toLowerCase();

      if (!clean) {
        return posts;
      }

      return posts.filter(
        (
          post
        ) =>
          post.text
            .toLowerCase()
            .includes(clean) ||
          post.author
            ?.username
            .toLowerCase()
            .includes(clean)
      );
    }, [
      posts,
      search,
    ]);


  function clearMedia() {
    setMediaFile(null);
    setMediaPreview("");
    setMediaError("");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }


  function selectMedia(
    file: File | null
  ) {
    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setMediaError(
        "Use JPG, PNG, WEBP ou GIF."
      );
      return;
    }

    setMediaFile(file);
    setMediaError("");
    setMediaPreview(
      URL.createObjectURL(file)
    );
  }


  async function publish() {
    const clean =
      text.trim();

    if (
      (!clean && !mediaFile) ||
      publishing
    ) {
      return;
    }

    let uploadedKey = "";

    try {
      setPublishing(
        true
      );
      setMediaError("");

      let media:
        EliseoMedia | null =
        null;

      if (mediaFile) {
        const isGif =
          mediaFile.type ===
          "image/gif";

        const uploaded =
          isGif
            ? await uploadGif(
                user.uid,
                mediaFile
              )
            : await uploadPostImage(
                user.uid,
                mediaFile
              );

        uploadedKey =
          uploaded.key;

        media = {
          url: uploaded.url,
          type: isGif
            ? "gif"
            : "image",
          key: uploaded.key,
        };
      }

      await createPost(
        user.uid,
        clean,
        media
      );

      setText("");
      clearMedia();
    } catch (error) {
      if (uploadedKey) {
        try {
          await deleteStoredFile(
            uploadedKey
          );
        } catch {
          // Se a limpeza falhar,
          // não esconde o erro principal.
        }
      }

      setMediaError(
        error instanceof Error
          ? error.message
          : "Não foi possível publicar."
      );
    } finally {
      setPublishing(
        false
      );
    }
  }


  return (
  <main className="el-feed-main">

        <header className="el-feed-top">

          <nav className="el-feed-tabs">

            <button
              className={
                tab ===
                "for-you"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  "for-you"
                )
              }
            >
              Para você
            </button>


            <button
              className={
                tab ===
                "recommended"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  "recommended"
                )
              }
            >
              Recomendados
            </button>


            <button
              className={
                tab ===
                "trending"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  "trending"
                )
              }
            >
              Em alta
            </button>

          </nav>


          <div className="el-feed-search">

            <Search size={19} />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Buscar posts"
            />

          </div>


          <button className="el-feed-header-icon">
            <VolumeX size={23} />
          </button>


          <button className="el-feed-header-icon">
            <MoreHorizontal
              size={23}
            />
          </button>

        </header>


        <div className="el-feed-scroll">

          <section className="el-feed-composer">

            <div className="el-feed-composer-top">

              <Avatar
                user={profile}
              />


              <textarea
                value={text}
                onChange={(e) =>
                  setText(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                      "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();

                    publish();
                  }
                }}
                placeholder="O que você quer compartilhar?"
                maxLength={500}
              />

            </div>


            {mediaPreview && (
              <div className="el-feed-media-preview">

                <img
                  src={mediaPreview}
                  alt="Prévia da mídia"
                />

                <span className="el-feed-media-kind">
                  {mediaFile?.type ===
                  "image/gif"
                    ? "GIF"
                    : "Imagem"}
                </span>

                <button
                  type="button"
                  className="el-feed-media-remove"
                  onClick={clearMedia}
                  title="Remover mídia"
                  disabled={publishing}
                >
                  <X size={18} />
                </button>

              </div>
            )}


            {mediaError && (
              <div className="el-feed-media-error">
                {mediaError}
              </div>
            )}


            <div className="el-feed-composer-bottom">

              <input
                ref={fileInputRef}
                className="el-feed-media-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  selectMedia(
                    e.target.files?.[0] ||
                    null
                  );
                }}
              />


              <button
                type="button"
                title="Adicionar foto ou GIF"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={publishing}
              >
                <ImageIcon
                  size={21}
                />

                <span>
                  Mídia
                </span>
              </button>


              <button
                title="Em breve"
              >
                <MapPin size={21} />

                <span>
                  Localização
                </span>
              </button>


              <div className="el-feed-compose-spacer" />


              {(text.trim() || mediaFile) && (
                <button
                  className="el-feed-publish"
                  onClick={
                    publish
                  }
                  disabled={
                    publishing
                  }
                >
                  <Send size={18} />

                  {publishing
                    ? "Publicando..."
                    : "Publicar"}
                </button>
              )}

            </div>

          </section>


          <section className="el-feed-post-list">

            {visiblePosts.length ===
              0 && (

              <div className="el-feed-empty">

                <MessageCircle
                  size={34}
                />

                <strong>
                  Nenhuma publicação encontrada
                </strong>

                <span>
                  O feed está esperando alguma coisa interessante.
                </span>

              </div>

            )}


            {visiblePosts.map(
              (
                post
              ) => (
                <FeedPost
                  key={
                    post.id
                  }
                  post={
                    post
                  }
                  user={
                    user
                  }
                />
              )
            )}

          </section>

        </div>

        </main>
);
}


export default Feed;