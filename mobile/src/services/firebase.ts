import {
  getAuth,
} from '@react-native-firebase/auth';

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

export const auth =
  getAuth();

export const db =
  getFirestore();

/* =========================================================
   USUÁRIOS
   ========================================================= */

export type EliseoUser = {
  uid: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  banner?: string;
  course?: string;
  institutionalEmail?: string;
  institutionDomain?: string;
  institutionName?: string;
  institutionTag?: string;
  status?: 'online' | 'busy' | 'offline';
  musicProvider?: 'spotify' | 'youtube_music' | 'qobuz' | null;
  musicActivity?: import('./music').MusicActivity | null;
};

export async function ensureUserProfile(
  uid: string,
  email: string,
) {
  const userRef =
    doc(
      db,
      'users',
      uid,
    );

  const snapshot =
    await getDoc(
      userRef,
    );

  if (
    snapshot.exists()
  ) {
    return;
  }

  const username =
    email
      .split('@')[0]
      .toLowerCase();

  await setDoc(
    userRef,
    {
      email,
      username,
      avatar: '',
      bio: '',

      createdAt:
        serverTimestamp(),
    },
  );
}

export async function getUserById(
  uid: string,
): Promise<
  EliseoUser | null
> {
  const snapshot =
    await getDoc(
      doc(
        db,
        'users',
        uid,
      ),
    );

  if (
    !snapshot.exists()
  ) {
    return null;
  }

  const data =
    snapshot.data();

  return {
    uid:
      snapshot.id,

    email:
      data?.email ??
      '',

    username:
      data?.username ??
      '',

    avatar:
      data?.avatar ??
      '',

    bio:
      data?.bio ??
      '',

    status:
      data?.status === 'online' || data?.status === 'busy' || data?.status === 'offline'
        ? data.status
        : 'offline',

    musicProvider:
      data?.musicProvider === 'spotify' || data?.musicProvider === 'youtube_music' || data?.musicProvider === 'qobuz'
        ? data.musicProvider
        : null,

    musicActivity:
      data?.musicActivity ??
      null,


    banner:

      data?.banner ??

      '',


    course:

      data?.course ??

      '',


    institutionalEmail:

      data?.institutionalEmail ??

      '',


    institutionDomain:

      data?.institutionDomain ??

      '',


    institutionName:

      data?.institutionName ??

      '',


    institutionTag:

      data?.institutionTag ??

      '',
  };
}

export function listenToUserProfile(
  uid: string,
  callback: (
    profile:
      EliseoUser | null,
  ) => void,
) {
  return onSnapshot(
    doc(
      db,
      'users',
      uid,
    ),

    snapshot => {
      if (
        !snapshot.exists()
      ) {
        callback(null);
        return;
      }

      const data =
        snapshot.data();

      callback({
        uid:
          snapshot.id,

        email:
          data?.email ??
          '',

        username:
          data?.username ??
          '',

        avatar:
          data?.avatar ??
          '',

        bio:
          data?.bio ??
          '',

    status:
      data?.status === 'online' || data?.status === 'busy' || data?.status === 'offline'
        ? data.status
        : 'offline',

    musicProvider:
      data?.musicProvider === 'spotify' || data?.musicProvider === 'youtube_music' || data?.musicProvider === 'qobuz'
        ? data.musicProvider
        : null,

    musicActivity:
      data?.musicActivity ??
      null,


        banner:

          data?.banner ??

          '',


        course:

          data?.course ??

          '',


        institutionalEmail:

          data?.institutionalEmail ??

          '',


        institutionDomain:

          data?.institutionDomain ??

          '',


        institutionName:

          data?.institutionName ??

          '',


        institutionTag:

          data?.institutionTag ??

          '',
      });
    },
  );
}

export async function searchUsers(
  search: string,
  currentUid: string,
): Promise<
  EliseoUser[]
> {
  const normalized =
    search
      .trim()
      .replace(
        /^@/,
        '',
      )
      .toLowerCase();

  if (
    !normalized
  ) {
    return [];
  }

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          'users',
        ),

        where(
          'username',
          '>=',
          normalized,
        ),

        where(
          'username',
          '<=',
          normalized +
            '\uf8ff',
        ),
      ),
    );

  return snapshot.docs
    .filter(
      userDoc =>
        userDoc.id !==
        currentUid,
    )
    .map(
      userDoc => {
        const data =
          userDoc.data();

        return {
          uid:
            userDoc.id,

          email:
            data?.email ??
            '',

          username:
            data?.username ??
            '',

          avatar:
            data?.avatar ??
            '',

          bio:
            data?.bio ??
            '',

    status:
      data?.status === 'online' || data?.status === 'busy' || data?.status === 'offline'
        ? data.status
        : 'offline',

    musicProvider:
      data?.musicProvider === 'spotify' || data?.musicProvider === 'youtube_music' || data?.musicProvider === 'qobuz'
        ? data.musicProvider
        : null,

    musicActivity:
      data?.musicActivity ??
      null,


          banner:

            data?.banner ??

            '',


          course:

            data?.course ??

            '',


          institutionalEmail:

            data?.institutionalEmail ??

            '',


          institutionDomain:

            data?.institutionDomain ??

            '',


          institutionName:

            data?.institutionName ??

            '',


          institutionTag:

            data?.institutionTag ??

            '',
        };
      },
    );
}

export async function updateUserProfile(
  uid: string,
  username: string,
  bio: string,
) {
  const normalizedUsername =
    username
      .trim()
      .toLowerCase();

  if (
    normalizedUsername
      .length < 3
  ) {
    throw new Error(
      'O username precisa ter pelo menos 3 caracteres.',
    );
  }

  if (
    !/^[a-z0-9._]+$/.test(
      normalizedUsername,
    )
  ) {
    throw new Error(
      'Use apenas letras, números, ponto e underline.',
    );
  }

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          'users',
        ),

        where(
          'username',
          '==',
          normalizedUsername,
        ),
      ),
    );

  const usernameTaken =
    snapshot.docs.some(
      userDoc =>
        userDoc.id !== uid,
    );

  if (
    usernameTaken
  ) {
    throw new Error(
      'Esse username já está em uso.',
    );
  }

  await updateDoc(
    doc(
      db,
      'users',
      uid,
    ),

    {
      username:
        normalizedUsername,

      bio:
        bio.trim(),

      updatedAt:
        serverTimestamp(),
    },
  );
}

export async function updateAcademicProfile(
  uid: string,
  values: {
    course?: string;
    institutionalEmail?: string;
    institutionDomain?: string;
    institutionName?: string;
    institutionTag?: string;
  },
) {
  const update: Record<string, unknown> = {
    updatedAt:
      serverTimestamp(),
  };

  if (values.course !== undefined) {
    update.course =
      values.course.trim().slice(0, 80);
  }

  for (const key of [
    'institutionalEmail',
    'institutionDomain',
    'institutionName',
    'institutionTag',
  ] as const) {
    if (values[key] !== undefined) {
      update[key] =
        values[key]?.trim() ?? '';
    }
  }

  await updateDoc(
    doc(db, 'users', uid),
    update,
  );
}

export async function updateUserBanner(
  uid: string,
  bannerUrl: string,
) {
  await updateDoc(
    doc(db, 'users', uid),
    {
      banner:
        bannerUrl,
      updatedAt:
        serverTimestamp(),
    },
  );
}

export async function updateUserStatus(
  uid: string,
  status: 'online' | 'busy' | 'offline',
) {
  const safe =
    status === 'online' || status === 'busy' || status === 'offline'
      ? status
      : 'offline';

  await updateDoc(
    doc(db, 'users', uid),
    {
      status: safe,
      updatedAt: serverTimestamp(),
    },
  );
}

/* =========================================================
   DMs
   ========================================================= */

export type FirestoreMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
};

export type ConversationListItem = {
  id: string;

  otherUser:
    EliseoUser;

  lastMessage:
    string;

  lastMessageAt:
    any;

  unread:
    number;
};

export async function getOrCreateConversation(
  currentUid: string,
  otherUid: string,
): Promise<string> {
  const conversationsRef =
    collection(
      db,
      'conversations',
    );

  const snapshot =
    await getDocs(
      query(
        conversationsRef,

        where(
          'members',
          'array-contains',
          currentUid,
        ),
      ),
    );

  for (
    const conversationDoc
    of snapshot.docs
  ) {
    const data =
      conversationDoc.data();

    const members:
      string[] =
      data?.members ??
      [];

    if (
      members.includes(
        otherUid,
      )
    ) {
      return conversationDoc.id;
    }
  }

  const newConversation =
    await addDoc(
      conversationsRef,

      {
        members: [
          currentUid,
          otherUid,
        ],

        lastMessage:
          '',

        lastSenderId:
          '',

        lastMessageAt:
          serverTimestamp(),

        unreadCounts: {
          [currentUid]:
            0,

          [otherUid]:
            0,
        },

        createdAt:
          serverTimestamp(),
      },
    );

  return newConversation.id;
}

export function listenToUserConversations(
  currentUid: string,
  callback: (
    conversations:
      ConversationListItem[],
  ) => void,
) {
  const conversationsQuery =
    query(
      collection(
        db,
        'conversations',
      ),

      where(
        'members',
        'array-contains',
        currentUid,
      ),
    );

  return onSnapshot(
    conversationsQuery,

    async snapshot => {
      const result:
        ConversationListItem[] =
        [];

      for (
        const conversationDoc
        of snapshot.docs
      ) {
        const data =
          conversationDoc.data();

        const members:
          string[] =
          data?.members ??
          [];

        const otherUid =
          members.find(
            uid =>
              uid !==
              currentUid,
          );

        if (
          !otherUid
        ) {
          continue;
        }

        const otherUser =
          await getUserById(
            otherUid,
          );

        if (
          !otherUser
        ) {
          continue;
        }

        const unreadCounts =
          data?.unreadCounts ??
          {};

        result.push({
          id:
            conversationDoc.id,

          otherUser,

          lastMessage:
            data?.lastMessage ??
            '',

          lastMessageAt:
            data?.lastMessageAt ??
            null,

          unread:
            unreadCounts[
              currentUid
            ] ?? 0,
        });
      }

      result.sort(
        (
          a,
          b,
        ) => {
          const aTime =
            a.lastMessageAt
              ?.toMillis?.() ??
            0;

          const bTime =
            b.lastMessageAt
              ?.toMillis?.() ??
            0;

          return (
            bTime -
            aTime
          );
        },
      );

      callback(
        result,
      );
    },
  );
}

export async function markConversationRead(
  conversationId: string,
  uid: string,
) {
  const unreadField =
    `unreadCounts.${uid}`;

  await updateDoc(
    doc(
      db,
      'conversations',
      conversationId,
    ),

    {
      [unreadField]:
        0,
    },
  );
}

export function listenToMessages(
  conversationId: string,
  callback: (
    messages:
      FirestoreMessage[],
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
      const messages =
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
            };
          },
        );

      callback(
        messages,
      );
    },
  );
}

export async function sendFirestoreMessage(
  conversationId: string,
  senderId: string,
  text: string,
) {
  const cleanText =
    text.trim();

  if (
    !cleanText
  ) {
    return;
  }

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

  const members:
    string[] =
    conversationData
      ?.members ??
    [];

  const receiverId =
    members.find(
      uid =>
        uid !==
        senderId,
    );

  const messageRef =
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
    },
  );

  await updateDoc(
    conversationRef,

    {
      lastMessage:
        cleanText,

      lastSenderId:
        senderId,

      lastMessageAt:
        serverTimestamp(),
    },
  );

  const senderField =
    `unreadCounts.${senderId}`;

  await updateDoc(
    conversationRef,

    {
      [senderField]:
        0,
    },
  );

  if (
    receiverId
  ) {
    const receiverField =
      `unreadCounts.${receiverId}`;

    await updateDoc(
      conversationRef,

      {
        [receiverField]:
          increment(1),
      },
    );
  }


  return messageRef.id;
}

/* =========================================================
   SERVIDORES
   ========================================================= */

export type EliseoServer = {
  id: string;
  name: string;
  ownerId: string;
  members: string[];

  photo?: string;
  banner?: string;

  createdAt?: any;
};

function mapServer(
  snapshot: any,
): EliseoServer {
  const data =
    snapshot.data();

  return {
    id:
      snapshot.id,

    name:
      data?.name ??
      'Servidor',

    ownerId:
      data?.ownerId ??
      '',

    members:
      data?.members ??
      [],

    photo:
      data?.photo ??
      '',

    banner:
      data?.banner ??
      '',

    createdAt:
      data?.createdAt ??
      null,
  };
}

export async function createServer(
  ownerId: string,
  name: string,
) {
  const cleanName =
    name.trim();

  if (
    cleanName.length < 2
  ) {
    throw new Error(
      'Digite um nome para o servidor.',
    );
  }

  if (
    cleanName.length > 40
  ) {
    throw new Error(
      'O nome pode ter no máximo 40 caracteres.',
    );
  }

  const serverRef =
    doc(
      collection(
        db,
        'servers',
      ),
    );

  await setDoc(
    serverRef,

    {
      name:
        cleanName,

      ownerId,

      members: [
        ownerId,
      ],

      photo:
        '',

      banner:
        '',

      createdAt:
        serverTimestamp(),
    },
  );

  const channelRef =
    doc(
      collection(
        db,
        'servers',
        serverRef.id,
        'channels',
      ),
    );

  await setDoc(
    channelRef,

    {
      name:
        'geral',

      createdBy:
        ownerId,

      createdAt:
        serverTimestamp(),
    },
  );

  return serverRef.id;
}

export function listenToUserServers(
  uid: string,
  callback: (
    servers:
      EliseoServer[],
  ) => void,
) {
  return onSnapshot(
    query(
      collection(
        db,
        'servers',
      ),

      where(
        'members',
        'array-contains',
        uid,
      ),
    ),

    snapshot => {
      const servers =
        snapshot.docs.map(
          server =>
            mapServer(
              server,
            ),
        );

      servers.sort(
        (
          a,
          b,
        ) => {
          const aTime =
            a.createdAt
              ?.toMillis?.() ??
            0;

          const bTime =
            b.createdAt
              ?.toMillis?.() ??
            0;

          return (
            bTime -
            aTime
          );
        },
      );

      callback(
        servers,
      );
    },
  );
}

export function listenToServer(
  serverId: string,
  callback: (
    server:
      EliseoServer | null,
  ) => void,
) {
  return onSnapshot(
    doc(
      db,
      'servers',
      serverId,
    ),

    snapshot => {
      if (
        !snapshot.exists()
      ) {
        callback(null);
        return;
      }

      callback(
        mapServer(
          snapshot,
        ),
      );
    },
  );
}

export async function joinServerById(
  serverId: string,
  uid: string,
) {
  const cleanId =
    serverId.trim();

  if (
    !cleanId
  ) {
    throw new Error(
      'Digite o ID do servidor.',
    );
  }

  const serverRef =
    doc(
      db,
      'servers',
      cleanId,
    );

  const snapshot =
    await getDoc(
      serverRef,
    );

  if (
    !snapshot.exists()
  ) {
    throw new Error(
      'Servidor não encontrado.',
    );
  }

  await updateDoc(
    serverRef,

    {
      members:
        arrayUnion(
          uid,
        ),
    },
  );

  return mapServer(
    snapshot,
  );
}

export async function updateServerSettings(
  serverId: string,
  uid: string,
  settings: {
    name?: string;
    photo?: string;
    banner?: string;
  },
) {
  const serverRef =
    doc(db, 'servers', serverId);
  const snapshot =
    await getDoc(serverRef);

  if (!snapshot.exists()) {
    throw new Error('Servidor não encontrado.');
  }
  if (snapshot.data()?.ownerId !== uid) {
    throw new Error('Somente o dono pode alterar o servidor.');
  }

  await updateDoc(serverRef, settings);
}

/* =========================================================
   CANAIS
   ========================================================= */

export type EliseoChannel = {
  id: string;
  name: string;
  createdBy: string;
  createdAt?: any;
};

export function listenToServerChannels(
  serverId: string,
  callback: (
    channels:
      EliseoChannel[],
  ) => void,
) {
  return onSnapshot(
    query(
      collection(
        db,
        'servers',
        serverId,
        'channels',
      ),

      orderBy(
        'createdAt',
        'asc',
      ),
    ),

    snapshot => {
      const channels =
        snapshot.docs.map(
          channel => {
            const data =
              channel.data();

            return {
              id:
                channel.id,

              name:
                data?.name ??
                'canal',

              createdBy:
                data?.createdBy ??
                '',

              createdAt:
                data?.createdAt ??
                null,
            };
          },
        );

      callback(
        channels,
      );
    },
  );
}

export async function createServerChannel(
  serverId: string,
  uid: string,
  name: string,
) {
  const cleanName =
    name.trim();

  if (
    !cleanName
  ) {
    throw new Error(
      'Digite o nome do canal.',
    );
  }

  if (
    cleanName.length > 30
  ) {
    throw new Error(
      'O nome do canal pode ter no máximo 30 caracteres.',
    );
  }

  const serverRef =
    doc(
      db,
      'servers',
      serverId,
    );

  const snapshot =
    await getDoc(
      serverRef,
    );

  if (
    !snapshot.exists()
  ) {
    throw new Error(
      'Servidor não encontrado.',
    );
  }

  if (
    snapshot.data()
      ?.ownerId !== uid
  ) {
    throw new Error(
      'Somente o dono pode criar canais.',
    );
  }

  const channelRef =
    await addDoc(
      collection(
        db,
        'servers',
        serverId,
        'channels',
      ),

      {
        name:
          cleanName,

        createdBy:
          uid,

        createdAt:
          serverTimestamp(),
      },
    );

  return channelRef.id;
}

/* =========================================================
   MENSAGENS DOS CANAIS
   ========================================================= */

export type EliseoChannelMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: any;
};

export function listenToChannelMessages(
  serverId: string,
  channelId: string,
  callback: (
    messages:
      EliseoChannelMessage[],
  ) => void,
) {
  return onSnapshot(
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
    ),

    snapshot => {
      const messages =
        snapshot.docs.map(
          message => {
            const data =
              message.data();

            return {
              id:
                message.id,

              senderId:
                data?.senderId ??
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
        messages,
      );
    },
  );
}

export async function sendChannelMessage(
  serverId: string,
  channelId: string,
  uid: string,
  text: string,
) {
  const cleanText =
    text.trim();

  if (
    !cleanText
  ) {
    return;
  }

  const messageRef =
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
      senderId:
        uid,

      text:
        cleanText,

      createdAt:
        serverTimestamp(),
    },
  );


  return messageRef.id;
}