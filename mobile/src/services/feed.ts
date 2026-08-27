import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@react-native-firebase/firestore';

import {db} from './firebase';

/* =========================================================
   TIPOS
   ========================================================= */

export type EliseoPost = {
  id: string;
  authorId: string;
  text: string;
  createdAt: any;

  repostOf?: string | null;
  repostAuthorId?: string | null;

  imageUrl?: string;
};

export type EliseoComment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: any;
};

/* =========================================================
   POSTS
   ========================================================= */

export async function createPost(
  authorId: string,
  text: string,
) {
  const cleanText =
    text.trim();

  if (!cleanText) {
    return;
  }

  if (
    cleanText.length > 500
  ) {
    throw new Error(
      'A publicação pode ter no máximo 500 caracteres.',
    );
  }

  await addDoc(
    collection(
      db,
      'posts',
    ),
    {
      authorId,

      text:
        cleanText,

      repostOf:
        null,

      repostAuthorId:
        null,

      createdAt:
        serverTimestamp(),
    },
  );
}

export function listenToPosts(
  callback: (
    posts: EliseoPost[],
  ) => void,
) {
  const postsQuery =
    query(
      collection(
        db,
        'posts',
      ),

      orderBy(
        'createdAt',
        'desc',
      ),
    );

  return onSnapshot(
    postsQuery,

    snapshot => {
      const posts =
        snapshot.docs.map(
          postDoc => {
            const data =
              postDoc.data();

            return {
              id:
                postDoc.id,

              authorId:
                data?.authorId ??
                '',

              text:
                data?.text ??
                '',

              createdAt:
                data?.createdAt ??
                null,

              repostOf:
                data?.repostOf ??
                null,

              repostAuthorId:
                data?.repostAuthorId ??
                null,

              imageUrl:
                data?.imageUrl ??
                data?.mediaUrl ??
                '',
            };
          },
        );

      callback(posts);
    },
  );
}

/* =========================================================
   EXCLUIR
   ========================================================= */

export async function deletePost(
  postId: string,
  currentUid: string,
) {
  const postRef =
    doc(
      db,
      'posts',
      postId,
    );

  const snapshot =
    await getDoc(
      postRef,
    );

  if (
    !snapshot.exists()
  ) {
    return;
  }

  if (
    snapshot.data()
      ?.authorId !==
    currentUid
  ) {
    throw new Error(
      'Você não pode excluir essa publicação.',
    );
  }

  await deleteDoc(
    postRef,
  );
}

/* =========================================================
   REPOST
   ========================================================= */

export async function repostPost(
  post: EliseoPost,
  currentUid: string,
) {
  await addDoc(
    collection(
      db,
      'posts',
    ),

    {
      authorId:
        currentUid,

      text:
        post.text,

      repostOf:
        post.repostOf ||
        post.id,

      repostAuthorId:
        post.repostAuthorId ||
        post.authorId,

      createdAt:
        serverTimestamp(),
    },
  );
}

export function listenToRepostCount(
  originalPostId: string,
  callback: (
    count: number,
  ) => void,
) {
  return onSnapshot(
    query(
      collection(
        db,
        'posts',
      ),

      where(
        'repostOf',
        '==',
        originalPostId,
      ),
    ),

    snapshot => {
      callback(
        snapshot.size,
      );
    },
  );
}

/* =========================================================
   CURTIDAS
   ========================================================= */

export async function togglePostLike(
  postId: string,
  uid: string,
) {
  const likeRef =
    doc(
      db,
      'posts',
      postId,
      'likes',
      uid,
    );

  const snapshot =
    await getDoc(
      likeRef,
    );

  if (
    snapshot.exists()
  ) {
    await deleteDoc(
      likeRef,
    );

    return;
  }

  await setDoc(
    likeRef,

    {
      uid,

      createdAt:
        serverTimestamp(),
    },
  );
}

export function listenToPostLikes(
  postId: string,
  currentUid: string,
  callback: (
    count: number,
    likedByMe: boolean,
  ) => void,
) {
  return onSnapshot(
    collection(
      db,
      'posts',
      postId,
      'likes',
    ),

    snapshot => {
      const likedByMe =
        snapshot.docs.some(
          likeDoc =>
            likeDoc.id ===
            currentUid,
        );

      callback(
        snapshot.size,
        likedByMe,
      );
    },
  );
}

/* =========================================================
   COMENTÁRIOS
   ========================================================= */

export async function createComment(
  postId: string,
  authorId: string,
  text: string,
) {
  const cleanText =
    text.trim();

  if (!cleanText) {
    return;
  }

  await addDoc(
    collection(
      db,
      'posts',
      postId,
      'comments',
    ),

    {
      authorId,

      text:
        cleanText,

      createdAt:
        serverTimestamp(),
    },
  );
}

export function listenToComments(
  postId: string,
  callback: (
    comments:
      EliseoComment[],
  ) => void,
) {
  return onSnapshot(
    query(
      collection(
        db,
        'posts',
        postId,
        'comments',
      ),

      orderBy(
        'createdAt',
        'asc',
      ),
    ),

    snapshot => {
      const comments =
        snapshot.docs.map(
          commentDoc => {
            const data =
              commentDoc.data();

            return {
              id:
                commentDoc.id,

              authorId:
                data?.authorId ??
                '',

              text:
                data?.text ??
                '',

              createdAt:
                data?.createdAt ??
                null,
            };
          },
        );

      callback(
        comments,
      );
    },
  );
}

export async function deleteComment(
  postId: string,
  commentId: string,
  currentUid: string,
) {
  const commentRef =
    doc(
      db,
      'posts',
      postId,
      'comments',
      commentId,
    );

  const snapshot =
    await getDoc(
      commentRef,
    );

  if (
    !snapshot.exists()
  ) {
    return;
  }

  if (
    snapshot.data()
      ?.authorId !==
    currentUid
  ) {
    throw new Error(
      'Você não pode excluir esse comentário.',
    );
  }

  await deleteDoc(
    commentRef,
  );
}