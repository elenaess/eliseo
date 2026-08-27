import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from '@react-native-firebase/firestore';

import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from '@react-native-documents/picker';

import {
  db,
} from './firebase';

import type {
  EliseoUploadFile,
  UploadedFile,
} from './storage';

export type EliseoMediaType =
  | 'image';

export type EliseoMediaMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: any;
  mediaUrl?: string;
  mediaType?: EliseoMediaType;
  mediaKey?: string;
};

export type EliseoMediaPost = {
  id: string;
  authorId: string;
  text: string;
  createdAt?: any;
  repostOf?: string | null;
  repostAuthorId?: string | null;
  imageUrl?: string;
  imageKey?: string;
};

export async function pickSingleImage(): Promise<
  EliseoUploadFile | null
> {
  try {
    const result = await pick({
      allowMultiSelection: false,
      type: [types.images],
    });

    const selected =
      result[0];

    if (!selected) {
      return null;
    }

    return {
      uri:
        selected.uri,
      name:
        selected.name ||
        `imagem-${Date.now()}.jpg`,
      type:
        selected.type ||
        'image/jpeg',
      size:
        selected.size ??
        null,
    };
  } catch (caught) {
    if (
      isErrorWithCode(caught) &&
      caught.code ===
        errorCodes.OPERATION_CANCELED
    ) {
      return null;
    }

    throw caught;
  }
}

export function listenToMediaPosts(
  callback: (
    posts: EliseoMediaPost[],
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
      callback(
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
                '',
              imageKey:
                data?.imageKey ??
                '',
            };
          },
        ),
      );
    },
  );
}

export async function createPostWithMedia(
  authorId: string,
  text: string,
  media?: UploadedFile | null,
) {
  const cleanText =
    text.trim();

  if (
    !cleanText &&
    !media
  ) {
    return;
  }

  const data: {
    authorId: string;
    text: string;
    repostOf: null;
    repostAuthorId: null;
    createdAt: any;
    imageUrl?: string;
    imageKey?: string;
  } = {
    authorId,
    text:
      cleanText,
    repostOf:
      null,
    repostAuthorId:
      null,
    createdAt:
      serverTimestamp(),
  };

  if (media) {
    data.imageUrl =
      media.url;
    data.imageKey =
      media.key;
  }

  await addDoc(
    collection(
      db,
      'posts',
    ),
    data,
  );
}

export function listenToMediaMessages(
  conversationId: string,
  callback: (
    messages: EliseoMediaMessage[],
  ) => void,
) {
  const messagesQuery =
    query(
      collection(
        db,
        'conversations',
        conversationId,
        'messages',
      ),
      orderBy(
        'createdAt',
        'asc',
      ),
    );

  return onSnapshot(
    messagesQuery,
    snapshot => {
      callback(
        snapshot.docs.map(
          messageDoc => {
            const data =
              messageDoc.data();

            return {
              id:
                messageDoc.id,
              senderId:
                data?.senderId ??
                '',
              text:
                data?.text ??
                '',
              createdAt:
                data?.createdAt ??
                null,
              mediaUrl:
                data?.mediaUrl ??
                '',
              mediaType:
                data?.mediaType ??
                undefined,
              mediaKey:
                data?.mediaKey ??
                '',
            };
          },
        ),
      );
    },
  );
}

export function listenToMediaChannelMessages(
  serverId: string,
  channelId: string,
  callback: (
    messages: EliseoMediaMessage[],
  ) => void,
) {
  const messagesQuery =
    query(
      collection(
        db,
        'servers',
        serverId,
        'channels',
        channelId,
        'messages',
      ),
      orderBy(
        'createdAt',
        'asc',
      ),
    );

  return onSnapshot(
    messagesQuery,
    snapshot => {
      callback(
        snapshot.docs.map(
          messageDoc => {
            const data =
              messageDoc.data();

            return {
              id:
                messageDoc.id,
              senderId:
                data?.senderId ??
                '',
              text:
                data?.text ??
                '',
              createdAt:
                data?.createdAt ??
                null,
              mediaUrl:
                data?.mediaUrl ??
                '',
              mediaType:
                data?.mediaType ??
                undefined,
              mediaKey:
                data?.mediaKey ??
                '',
            };
          },
        ),
      );
    },
  );
}

export async function sendDmMediaMessage(
  conversationId: string,
  senderId: string,
  text: string,
  media: UploadedFile,
) {
  const cleanText =
    text.trim();

  const conversationRef =
    doc(
      db,
      'conversations',
      conversationId,
    );

  const conversationSnapshot =
    await getDoc(
      conversationRef,
    );

  if (
    !conversationSnapshot.exists()
  ) {
    throw new Error(
      'Conversa não encontrada.',
    );
  }

  const conversationData =
    conversationSnapshot.data();

  const members: string[] =
    conversationData?.members ??
    [];

  const receiverId =
    members.find(
      uid =>
        uid !== senderId,
    );

  await addDoc(
    collection(
      db,
      'conversations',
      conversationId,
      'messages',
    ),
    {
      senderId,
      text:
        cleanText,
      createdAt:
        serverTimestamp(),
      mediaUrl:
        media.url,
      mediaType:
        'image',
      mediaKey:
        media.key,
    },
  );

  const unreadCounts = {
    ...(conversationData?.unreadCounts ??
      {}),
    [senderId]: 0,
  } as Record<string, number>;

  if (receiverId) {
    unreadCounts[receiverId] =
      Number(
        unreadCounts[
          receiverId
        ] ??
          0,
      ) +
      1;
  }

  await updateDoc(
    conversationRef,
    {
      lastMessage:
        cleanText ||
        '📷 Foto',
      lastSenderId:
        senderId,
      lastMessageAt:
        serverTimestamp(),
      unreadCounts,
    },
  );
}

export async function sendChannelMediaMessage(
  serverId: string,
  channelId: string,
  senderId: string,
  text: string,
  media: UploadedFile,
) {
  await addDoc(
    collection(
      db,
      'servers',
      serverId,
      'channels',
      channelId,
      'messages',
    ),
    {
      senderId,
      text:
        text.trim(),
      createdAt:
        serverTimestamp(),
      mediaUrl:
        media.url,
      mediaType:
        'image',
      mediaKey:
        media.key,
    },
  );
}

export async function updateProfileAvatar(
  uid: string,
  avatarUrl: string,
) {
  await updateDoc(
    doc(
      db,
      'users',
      uid,
    ),
    {
      avatar:
        avatarUrl,
      updatedAt:
        serverTimestamp(),
    },
  );
}
