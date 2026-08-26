import {
  addDoc,
  collection,
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "./firebase";


/* =========================================================
   TIPOS
   ========================================================= */

export type EliseoMediaType =
  | "image"
  | "gif";

export type EliseoMedia = {
  url: string;
  type: EliseoMediaType;
  key?: string;
};

export type FirestoreMessage = {
  id: string;
  senderId: string;
  text: string;

  mediaUrl?: string;
  mediaType?: EliseoMediaType;
  mediaKey?: string;

  createdAt: any;
};


export type EliseoUser = {
  uid: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
};


export type EliseoPixAction =
  | "pay"
  | "charge";

export type EliseoPixStatus =
  | "pending"
  | "accepted"
  | "payment_reported"
  | "paid"
  | "declined";

export type EliseoPixContext =
  | "dm"
  | "server";

export type EliseoPixRequest = {
  id: string;
  initiatorId: string;
  targetId: string;
  action: EliseoPixAction;
  amountCents: number;
  status: EliseoPixStatus;
  contextType: EliseoPixContext;
  conversationId?: string;
  serverId?: string;
  channelId?: string;
  createdAt?: any;
  respondedAt?: any;
  paymentReportedAt?: any;
  paidAt?: any;
};

export type EliseoPixSecret = {
  requestId: string;
  ownerId: string;
  allowedUid: string;
  pixKey: string;
};


export type ConversationListItem = {
  id: string;
  otherUser: EliseoUser;
  lastMessage: string;
  lastMessageAt: any;
  unread: number;
};


export type EliseoPost = {
  id: string;
  authorId: string;
  text: string;
  createdAt: any;

  mediaUrl?: string;
  mediaType?: EliseoMediaType;
  mediaKey?: string;

  repostOf?: string | null;
  repostAuthorId?: string | null;
};


export type EliseoComment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: any;
};


/* =========================================================
   PERFIL
   ========================================================= */

export async function createUserProfile(
  uid: string,
  email: string
) {
  const userRef = doc(
    db,
    "users",
    uid
  );

  const snapshot =
    await getDoc(userRef);

  if (snapshot.exists()) {
    return;
  }

  const username =
    email
      .split("@")[0]
      .toLowerCase();

  await setDoc(
    userRef,
    {
      email,
      username,
      avatar: "",
      bio: "",
      createdAt:
        serverTimestamp(),
    }
  );
}


export async function getUserById(
  uid: string
): Promise<EliseoUser | null> {
  const userRef =
    doc(
      db,
      "users",
      uid
    );

  const snapshot =
    await getDoc(
      userRef
    );

  if (!snapshot.exists()) {
    return null;
  }

  const data =
    snapshot.data();

  return {
    uid:
      snapshot.id,

    email:
      data.email ?? "",

    username:
      data.username ?? "",

    avatar:
      data.avatar ?? "",

    bio:
      data.bio ?? "",
  };
}


export async function updateUserProfile(
  uid: string,
  username: string,
  bio: string,
  avatar: string
) {
  const normalizedUsername =
    username
      .trim()
      .toLowerCase();

  if (
    normalizedUsername.length < 3
  ) {
    throw new Error(
      "O username precisa ter pelo menos 3 caracteres."
    );
  }

  if (
    !/^[a-z0-9._]+$/.test(
      normalizedUsername
    )
  ) {
    throw new Error(
      "Use apenas letras, números, ponto e underline."
    );
  }

  const usersRef =
    collection(
      db,
      "users"
    );

  const usernameQuery =
    query(
      usersRef,
      where(
        "username",
        "==",
        normalizedUsername
      )
    );

  const snapshot =
    await getDocs(
      usernameQuery
    );

  const usernameTaken =
    snapshot.docs.some(
      (
        userDoc
      ) =>
        userDoc.id !== uid
    );

  if (usernameTaken) {
    throw new Error(
      "Esse username já está em uso."
    );
  }

  const userRef =
    doc(
      db,
      "users",
      uid
    );

  await updateDoc(
    userRef,
    {
      username:
        normalizedUsername,

      bio:
        bio.trim(),

      avatar:
        avatar.trim(),

      updatedAt:
        serverTimestamp(),
    }
  );
}


/* =========================================================
   BUSCA DE USUÁRIOS
   ========================================================= */

export async function searchUsers(
  search: string,
  currentUid: string
): Promise<EliseoUser[]> {
  const normalized =
    search
      .trim()
      .toLowerCase();

  if (!normalized) {
    return [];
  }

  const usersRef =
    collection(
      db,
      "users"
    );

  const usersQuery =
    query(
      usersRef,

      where(
        "username",
        ">=",
        normalized
      ),

      where(
        "username",
        "<=",
        normalized + "\uf8ff"
      )
    );

  const snapshot =
    await getDocs(
      usersQuery
    );

  return snapshot.docs
    .filter(
      (
        userDoc
      ) =>
        userDoc.id !==
        currentUid
    )
    .map(
      (
        userDoc
      ) => {
        const data =
          userDoc.data();

        return {
          uid:
            userDoc.id,

          email:
            data.email ?? "",

          username:
            data.username ?? "",

          avatar:
            data.avatar ?? "",

          bio:
            data.bio ?? "",
        };
      }
    );
}


/* =========================================================
   PIX / P2P
   ========================================================= */

export async function getUserByUsername(
  username: string
): Promise<EliseoUser | null> {
  const normalized =
    username
      .trim()
      .replace(/^@/, "")
      .toLowerCase();

  if (!normalized) {
    return null;
  }

  const snapshot =
    await getDocs(
      query(
        collection(db, "users"),
        where(
          "username",
          "==",
          normalized
        )
      )
    );

  const userDoc =
    snapshot.docs[0];

  if (!userDoc) {
    return null;
  }

  const data =
    userDoc.data();

  return {
    uid: userDoc.id,
    email: data.email ?? "",
    username: data.username ?? "",
    avatar: data.avatar ?? "",
    bio: data.bio ?? "",
  };
}


export async function getMyPixKey(
  uid: string
): Promise<string> {
  const snapshot =
    await getDoc(
      doc(
        db,
        "pixProfiles",
        uid
      )
    );

  if (!snapshot.exists()) {
    return "";
  }

  return (
    snapshot.data().pixKey ?? ""
  ).trim();
}


export async function saveMyPixKey(
  uid: string,
  pixKey: string
) {
  const clean =
    pixKey.trim();

  if (clean.length < 3) {
    throw new Error(
      "Digite uma chave Pix válida."
    );
  }

  await setDoc(
    doc(
      db,
      "pixProfiles",
      uid
    ),
    {
      pixKey: clean,
      updatedAt:
        serverTimestamp(),
    },
    { merge: true }
  );
}


function mapPixRequest(
  requestDoc: any
): EliseoPixRequest {
  const data =
    requestDoc.data();

  return {
    id: requestDoc.id,
    initiatorId:
      data.initiatorId ?? "",
    targetId:
      data.targetId ?? "",
    action:
      data.action ?? "charge",
    amountCents:
      data.amountCents ?? 0,
    status:
      data.status ?? "pending",
    contextType:
      data.contextType ?? "dm",
    conversationId:
      data.conversationId ?? undefined,
    serverId:
      data.serverId ?? undefined,
    channelId:
      data.channelId ?? undefined,
    createdAt:
      data.createdAt ?? null,
    respondedAt:
      data.respondedAt ?? null,
    paymentReportedAt:
      data.paymentReportedAt ?? null,
    paidAt:
      data.paidAt ?? null,
  };
}


function sortPixRequests(
  requests: EliseoPixRequest[]
) {
  return [...requests].sort(
    (a, b) => {
      const aMs =
        a.createdAt?.toMillis?.() ?? 0;
      const bMs =
        b.createdAt?.toMillis?.() ?? 0;

      return bMs - aMs;
    }
  );
}


export function listenToIncomingPixRequests(
  uid: string,
  callback: (
    requests: EliseoPixRequest[]
  ) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(
        db,
        "pixRequests"
      ),
      where(
        "targetId",
        "==",
        uid
      )
    ),
    (snapshot) => {
      callback(
        sortPixRequests(
          snapshot.docs.map(
            mapPixRequest
          )
        )
      );
    }
  );
}


export function listenToOutgoingPixRequests(
  uid: string,
  callback: (
    requests: EliseoPixRequest[]
  ) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(
        db,
        "pixRequests"
      ),
      where(
        "initiatorId",
        "==",
        uid
      )
    ),
    (snapshot) => {
      callback(
        sortPixRequests(
          snapshot.docs.map(
            mapPixRequest
          )
        )
      );
    }
  );
}


export async function createPixRequest({
  initiatorId,
  targetId,
  action,
  amountCents,
  contextType,
  conversationId,
  serverId,
  channelId,
}: {
  initiatorId: string;
  targetId: string;
  action: EliseoPixAction;
  amountCents: number;
  contextType: EliseoPixContext;
  conversationId?: string;
  serverId?: string;
  channelId?: string;
}) {
  if (
    !initiatorId ||
    !targetId ||
    initiatorId === targetId
  ) {
    throw new Error(
      "Escolha outra pessoa para a operação P2P."
    );
  }

  if (
    !Number.isInteger(amountCents) ||
    amountCents <= 0
  ) {
    throw new Error(
      "Informe um valor maior que zero."
    );
  }

  let chargePixKey = "";

  if (action === "charge") {
    chargePixKey =
      await getMyPixKey(
        initiatorId
      );

    if (!chargePixKey) {
      throw new Error(
        "Cadastre sua chave Pix em Financeiro antes de cobrar."
      );
    }
  }

  const requestRef =
    doc(
      collection(
        db,
        "pixRequests"
      )
    );

  const batch =
    writeBatch(db);

  const requestData: any = {
    initiatorId,
    targetId,
    action,
    amountCents,
    status: "pending",
    contextType,
    createdAt:
      serverTimestamp(),
  };

  if (conversationId) {
    requestData.conversationId =
      conversationId;
  }

  if (serverId) {
    requestData.serverId =
      serverId;
  }

  if (channelId) {
    requestData.channelId =
      channelId;
  }

  batch.set(
    requestRef,
    requestData
  );

  if (
    action === "charge" &&
    chargePixKey
  ) {
    batch.set(
      doc(
        db,
        "pixRequestSecrets",
        requestRef.id
      ),
      {
        requestId:
          requestRef.id,
        ownerId:
          initiatorId,
        allowedUid:
          targetId,
        pixKey:
          chargePixKey,
        createdAt:
          serverTimestamp(),
      }
    );
  }

  await batch.commit();

  return requestRef.id;
}


export async function respondToPixRequest(
  request: EliseoPixRequest,
  currentUid: string,
  accept: boolean
) {
  if (
    request.targetId !==
    currentUid
  ) {
    throw new Error(
      "Somente a pessoa marcada pode responder."
    );
  }

  if (
    request.status !==
    "pending"
  ) {
    return;
  }

  const batch =
    writeBatch(db);

  if (
    accept &&
    request.action === "pay"
  ) {
    const pixKey =
      await getMyPixKey(
        currentUid
      );

    if (!pixKey) {
      throw new Error(
        "Cadastre sua chave Pix em Financeiro antes de aceitar o pagamento."
      );
    }

    batch.set(
      doc(
        db,
        "pixRequestSecrets",
        request.id
      ),
      {
        requestId:
          request.id,
        ownerId:
          currentUid,
        allowedUid:
          request.initiatorId,
        pixKey,
        createdAt:
          serverTimestamp(),
      }
    );
  }

  batch.update(
    doc(
      db,
      "pixRequests",
      request.id
    ),
    {
      status:
        accept
          ? "accepted"
          : "declined",
      respondedAt:
        serverTimestamp(),
    }
  );

  await batch.commit();
}


export async function markPixPaymentReported(
  request: EliseoPixRequest,
  currentUid: string
) {
  const payerId =
    request.action === "charge"
      ? request.targetId
      : request.initiatorId;

  if (currentUid !== payerId) {
    throw new Error(
      "Somente quem está pagando pode marcar o PIX como pago."
    );
  }

  if (request.status !== "accepted") {
    return;
  }

  await updateDoc(
    doc(
      db,
      "pixRequests",
      request.id
    ),
    {
      status: "payment_reported",
      paymentReportedAt:
        serverTimestamp(),
    }
  );
}


export async function confirmPixPaymentReceived(
  request: EliseoPixRequest,
  currentUid: string,
  received: boolean
) {
  const receiverId =
    request.action === "charge"
      ? request.initiatorId
      : request.targetId;

  if (currentUid !== receiverId) {
    throw new Error(
      "Somente quem recebe o PIX pode confirmar o recebimento."
    );
  }

  if (request.status !== "payment_reported") {
    return;
  }

  await updateDoc(
    doc(
      db,
      "pixRequests",
      request.id
    ),
    received
      ? {
          status: "paid",
          paidAt:
            serverTimestamp(),
        }
      : {
          status: "accepted",
        }
  );
}


export async function getPixRequestSecret(
  requestId: string
): Promise<EliseoPixSecret | null> {
  const snapshot =
    await getDoc(
      doc(
        db,
        "pixRequestSecrets",
        requestId
      )
    );

  if (!snapshot.exists()) {
    return null;
  }

  const data =
    snapshot.data();

  return {
    requestId:
      data.requestId ?? requestId,
    ownerId:
      data.ownerId ?? "",
    allowedUid:
      data.allowedUid ?? "",
    pixKey:
      data.pixKey ?? "",
  };
}


/* =========================================================
   DMs
   ========================================================= */

export async function getOrCreateConversation(
  currentUid: string,
  otherUid: string
): Promise<string> {
  const conversationsRef =
    collection(
      db,
      "conversations"
    );

  const conversationsQuery =
    query(
      conversationsRef,

      where(
        "members",
        "array-contains",
        currentUid
      )
    );

  const snapshot =
    await getDocs(
      conversationsQuery
    );

  for (
    const conversationDoc
    of snapshot.docs
  ) {
    const data =
      conversationDoc.data();

    const members:
      string[] =
      data.members ?? [];

    if (
      members.includes(
        otherUid
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

        lastMessage: "",

        lastSenderId: "",

        lastMessageAt:
          serverTimestamp(),

        unreadCounts: {
          [currentUid]: 0,
          [otherUid]: 0,
        },

        createdAt:
          serverTimestamp(),
      }
    );

  return newConversation.id;
}


export function listenToUserConversations(
  currentUid: string,
  callback: (
    conversations:
      ConversationListItem[]
  ) => void
): Unsubscribe {
  const conversationsRef =
    collection(
      db,
      "conversations"
    );

  const conversationsQuery =
    query(
      conversationsRef,

      where(
        "members",
        "array-contains",
        currentUid
      )
    );

  return onSnapshot(
    conversationsQuery,

    async (
      snapshot
    ) => {
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
          data.members ?? [];

        const otherUid =
          members.find(
            (
              uid
            ) =>
              uid !== currentUid
          );

        if (!otherUid) {
          continue;
        }

        const otherUser =
          await getUserById(
            otherUid
          );

        if (!otherUser) {
          continue;
        }

        const unreadCounts =
          data.unreadCounts ?? {};

        result.push({
          id:
            conversationDoc.id,

          otherUser,

          lastMessage:
            data.lastMessage ?? "",

          lastMessageAt:
            data.lastMessageAt ??
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
          b
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
        }
      );

      callback(
        result
      );
    }
  );
}


export async function markConversationRead(
  conversationId: string,
  uid: string
) {
  const conversationRef =
    doc(
      db,
      "conversations",
      conversationId
    );

  const unreadField =
    `unreadCounts.${uid}`;

  await updateDoc(
    conversationRef,
    unreadField,
    0
  );
}


/* =========================================================
   MENSAGENS
   ========================================================= */

export function listenToMessages(
  conversationId: string,
  callback: (
    messages:
      FirestoreMessage[]
  ) => void
): Unsubscribe {
  const messagesRef =
    collection(
      db,
      "conversations",
      conversationId,
      "messages"
    );

  const messagesQuery =
    query(
      messagesRef,

      orderBy(
        "createdAt",
        "asc"
      )
    );

  return onSnapshot(
    messagesQuery,

    (
      snapshot
    ) => {
      const messages:
        FirestoreMessage[] =
        snapshot.docs.map(
          (
            messageDoc
          ) => {
            const data =
              messageDoc.data();

            return {
              id:
                messageDoc.id,

              senderId:
                data.senderId ??
                "",

              text:
                data.text ??
                "",

              mediaUrl:
                data.mediaUrl ??
                "",

              mediaType:
                data.mediaType ??
                undefined,

              mediaKey:
                data.mediaKey ??
                "",

              createdAt:
                data.createdAt ??
                null,
            };
          }
        );

      callback(
        messages
      );
    }
  );
}


export async function sendFirestoreMessage(
  conversationId: string,
  senderId: string,
  text: string,
  media?: EliseoMedia | null
) {
  const cleanText =
    text.trim();

  const hasMedia =
    Boolean(
      media?.url
    );

  if (
    !cleanText &&
    !hasMedia
  ) {
    return;
  }

  const conversationRef =
    doc(
      db,
      "conversations",
      conversationId
    );

  const conversationSnapshot =
    await getDoc(
      conversationRef
    );

  if (
    !conversationSnapshot.exists()
  ) {
    throw new Error(
      "Conversa não encontrada."
    );
  }

  const conversationData =
    conversationSnapshot.data();

  const members:
    string[] =
    conversationData.members ??
    [];

  const receiverId =
    members.find(
      (
        uid
      ) =>
        uid !== senderId
    );

  const messagesRef =
    collection(
      db,
      "conversations",
      conversationId,
      "messages"
    );

  const messageData: {
    senderId: string;
    text: string;
    createdAt: any;
    mediaUrl?: string;
    mediaType?: EliseoMediaType;
    mediaKey?: string;
  } = {
    senderId,
    text:
      cleanText,
    createdAt:
      serverTimestamp(),
  };

  if (
    hasMedia &&
    media
  ) {
    messageData.mediaUrl =
      media.url;

    messageData.mediaType =
      media.type;

    if (media.key) {
      messageData.mediaKey =
        media.key;
    }
  }

  await addDoc(
    messagesRef,
    messageData
  );

  const lastMessage =
    cleanText ||
    (
      media?.type === "gif"
        ? "GIF"
        : "Imagem"
    );

  await updateDoc(
    conversationRef,
    {
      lastMessage,

      lastSenderId:
        senderId,

      lastMessageAt:
        serverTimestamp(),
    }
  );

  await updateDoc(
    conversationRef,
    `unreadCounts.${senderId}`,
    0
  );

  if (receiverId) {
    await updateDoc(
      conversationRef,
      `unreadCounts.${receiverId}`,
      increment(1)
    );
  }
}

/* =========================================================
   POSTS
   ========================================================= */

export async function createPost(
  authorId: string,
  text: string,
  media?: EliseoMedia | null
) {
  const cleanText =
    text.trim();

  const hasMedia =
    Boolean(
      media?.url
    );

  if (
    !cleanText &&
    !hasMedia
  ) {
    return;
  }

  const postData: {
    authorId: string;
    text: string;
    repostOf: null;
    repostAuthorId: null;
    createdAt: any;
    mediaUrl?: string;
    mediaType?: EliseoMediaType;
    mediaKey?: string;
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

  if (
    hasMedia &&
    media
  ) {
    postData.mediaUrl =
      media.url;

    postData.mediaType =
      media.type;

    if (media.key) {
      postData.mediaKey =
        media.key;
    }
  }

  await addDoc(
    collection(
      db,
      "posts"
    ),
    postData
  );
}

export function listenToPosts(
  callback: (
    posts:
      EliseoPost[]
  ) => void
): Unsubscribe {
  const postsQuery =
    query(
      collection(
        db,
        "posts"
      ),

      orderBy(
        "createdAt",
        "desc"
      )
    );

  return onSnapshot(
    postsQuery,

    (
      snapshot
    ) => {
      const posts:
        EliseoPost[] =
        snapshot.docs.map(
          (
            postDoc
          ) => {
            const data =
              postDoc.data();

            return {
              id:
                postDoc.id,

              authorId:
                data.authorId ??
                "",

              text:
                data.text ??
                "",

              mediaUrl:
                data.mediaUrl ??
                "",

              mediaType:
                data.mediaType ??
                undefined,

              mediaKey:
                data.mediaKey ??
                "",

              createdAt:
                data.createdAt ??
                null,

              repostOf:
                data.repostOf ??
                null,

              repostAuthorId:
                data.repostAuthorId ??
                null,
            };
          }
        );

      callback(
        posts
      );
    }
  );
}


/* =========================================================
   EXCLUIR POST
   ========================================================= */

export async function deletePost(
  postId: string,
  currentUid: string
) {
  const postRef =
    doc(
      db,
      "posts",
      postId
    );

  const snapshot =
    await getDoc(
      postRef
    );

  if (!snapshot.exists()) {
    return;
  }

  const data =
    snapshot.data();

  if (
    data.authorId !==
    currentUid
  ) {
    throw new Error(
      "Você não pode excluir esse post."
    );
  }

  await deleteDoc(
    postRef
  );
}


/* =========================================================
   REPOST
   ========================================================= */

export async function repostPost(
  post:
    EliseoPost,
  currentUid: string
) {
  const repostData: {
    authorId: string;
    text: string;
    repostOf: string;
    repostAuthorId: string;
    createdAt: any;
    mediaUrl?: string;
    mediaType?: EliseoMediaType;
    mediaKey?: string;
  } = {
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
  };

  if (post.mediaUrl) {
    repostData.mediaUrl =
      post.mediaUrl;

    if (post.mediaType) {
      repostData.mediaType =
        post.mediaType;
    }

    if (post.mediaKey) {
      repostData.mediaKey =
        post.mediaKey;
    }
  }

  await addDoc(
    collection(
      db,
      "posts"
    ),
    repostData
  );
}

/* =========================================================
   CONTADOR DE REPOSTS
   ========================================================= */

export function listenToRepostCount(
  originalPostId: string,
  callback: (
    count: number
  ) => void
): Unsubscribe {
  const postsRef =
    collection(
      db,
      "posts"
    );

  const repostQuery =
    query(
      postsRef,
      where(
        "repostOf",
        "==",
        originalPostId
      )
    );

  return onSnapshot(
    repostQuery,
    (
      snapshot
    ) => {
      callback(
        snapshot.size
      );
    }
  );
}


/* =========================================================
   CURTIDAS
   ========================================================= */

export async function togglePostLike(
  postId: string,
  uid: string
) {
  const likeRef =
    doc(
      db,
      "posts",
      postId,
      "likes",
      uid
    );

  const snapshot =
    await getDoc(
      likeRef
    );

  if (
    snapshot.exists()
  ) {
    await deleteDoc(
      likeRef
    );

    return;
  }

  await setDoc(
    likeRef,
    {
      uid,

      createdAt:
        serverTimestamp(),
    }
  );
}


export function listenToPostLikes(
  postId: string,
  currentUid: string,
  callback: (
    count: number,
    likedByMe: boolean
  ) => void
): Unsubscribe {
  const likesRef =
    collection(
      db,
      "posts",
      postId,
      "likes"
    );

  return onSnapshot(
    likesRef,
    (
      snapshot
    ) => {
      const likedByMe =
        snapshot.docs.some(
          (
            likeDoc
          ) =>
            likeDoc.id ===
            currentUid
        );

      callback(
        snapshot.size,
        likedByMe
      );
    }
  );
}


/* =========================================================
   COMENTÁRIOS
   ========================================================= */

export async function createComment(
  postId: string,
  authorId: string,
  text: string
) {
  const cleanText =
    text.trim();

  if (!cleanText) {
    return;
  }

  await addDoc(
    collection(
      db,
      "posts",
      postId,
      "comments"
    ),
    {
      authorId,

      text:
        cleanText,

      createdAt:
        serverTimestamp(),
    }
  );
}


export function listenToComments(
  postId: string,
  callback: (
    comments:
      EliseoComment[]
  ) => void
): Unsubscribe {
  const commentsRef =
    collection(
      db,
      "posts",
      postId,
      "comments"
    );

  const commentsQuery =
    query(
      commentsRef,

      orderBy(
        "createdAt",
        "asc"
      )
    );

  return onSnapshot(
    commentsQuery,
    (
      snapshot
    ) => {
      const comments:
        EliseoComment[] =
        snapshot.docs.map(
          (
            commentDoc
          ) => {
            const data =
              commentDoc.data();

            return {
              id:
                commentDoc.id,

              authorId:
                data.authorId ??
                "",

              text:
                data.text ??
                "",

              createdAt:
                data.createdAt ??
                null,
            };
          }
        );

      callback(
        comments
      );
    }
  );
}


/* =========================================================
   EXCLUIR COMENTÁRIO
   ========================================================= */

export async function deleteComment(
  postId: string,
  commentId: string,
  currentUid: string
) {
  const commentRef =
    doc(
      db,
      "posts",
      postId,
      "comments",
      commentId
    );

  const snapshot =
    await getDoc(
      commentRef
    );

  if (!snapshot.exists()) {
    return;
  }

  const data =
    snapshot.data();

  if (
    data.authorId !==
    currentUid
  ) {
    throw new Error(
      "Você não pode excluir esse comentário."
    );
  }

  await deleteDoc(
    commentRef
  );
}
/* =========================================================
   COMUNIDADES
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


export type EliseoChannel = {
  id: string;
  name: string;
  createdBy: string;

  createdAt?: any;
};


export type EliseoChannelMessage = {
  id: string;
  senderId: string;
  text: string;

  mediaUrl?: string;
  mediaType?: EliseoMediaType;
  mediaKey?: string;

  createdAt?: any;
};

export async function createServer(
  ownerId: string,
  name: string
) {
  const serverRef =
    doc(
      collection(
        db,
        "servers"
      )
    );

  await setDoc(
    serverRef,
    {
      name,
      ownerId,
      members: [
        ownerId,
      ],
      photo: "",
      banner: "",
      createdAt:
        serverTimestamp(),
    }
  );

  const channelRef =
    doc(
      collection(
        db,
        "servers",
        serverRef.id,
        "channels"
      )
    );

  await setDoc(
    channelRef,
    {
      name: "geral",
      createdBy:
        ownerId,
      createdAt:
        serverTimestamp(),
    }
  );

  return serverRef.id;
}
export function listenToUserServers(
  uid: string,
  callback: (
    servers: EliseoServer[]
  ) => void
): Unsubscribe {
  const q =
    query(
      collection(
        db,
        "servers"
      ),
      where(
        "members",
        "array-contains",
        uid
      )
    );

  return onSnapshot(
    q,
    (snapshot) => {
      const servers =
        snapshot.docs.map(
          (server) => ({
            id: server.id,
            ...server.data(),
          })
        ) as EliseoServer[];

      servers.sort(
        (a, b) => {
          const aTime =
            a.createdAt?.toMillis?.() ||
            0;

          const bTime =
            b.createdAt?.toMillis?.() ||
            0;

          return bTime - aTime;
        }
      );

      callback(servers);
    }
  );
}
export async function joinServerById(
  serverId: string,
  uid: string
) {
  const cleanId =
    serverId.trim();

  const serverRef =
    doc(
      db,
      "servers",
      cleanId
    );

  const snapshot =
    await getDoc(
      serverRef
    );

  if (!snapshot.exists()) {
    throw new Error(
      "Servidor não encontrado."
    );
  }

  await updateDoc(
    serverRef,
    {
      members:
        arrayUnion(uid),
    }
  );

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as EliseoServer;
}
export async function updateServerSettings(
  serverId: string,
  uid: string,
  settings: {
    name?: string;
    photo?: string;
    banner?: string;
  }
) {
  const serverRef =
    doc(
      db,
      "servers",
      serverId
    );

  const snapshot =
    await getDoc(
      serverRef
    );

  if (!snapshot.exists()) {
    throw new Error(
      "Servidor não encontrado."
    );
  }

  const server =
    snapshot.data();

  if (
    server.ownerId !==
    uid
  ) {
    throw new Error(
      "Somente o dono pode alterar o servidor."
    );
  }

  await updateDoc(
    serverRef,
    settings
  );
}
/* =========================================================
   CANAIS DO SERVIDOR
   ========================================================= */

export function listenToServerChannels(
  serverId: string,
  callback: (
    channels: EliseoChannel[]
  ) => void
): Unsubscribe {
  const q =
    query(
      collection(
        db,
        "servers",
        serverId,
        "channels"
      ),
      orderBy(
        "createdAt",
        "asc"
      )
    );

  return onSnapshot(
    q,
    (snapshot) => {
      const channels =
        snapshot.docs.map(
          (channel) => ({
            id: channel.id,
            ...channel.data(),
          })
        ) as EliseoChannel[];

      callback(channels);
    }
  );
}


/* =========================================================
   CRIAR CANAL
   ========================================================= */

export async function createServerChannel(
  serverId: string,
  uid: string,
  name: string
) {
  const serverRef =
    doc(
      db,
      "servers",
      serverId
    );

  const serverSnapshot =
    await getDoc(
      serverRef
    );

  if (
    !serverSnapshot.exists()
  ) {
    throw new Error(
      "Servidor não encontrado."
    );
  }

  if (
    serverSnapshot.data()
      .ownerId !==
    uid
  ) {
    throw new Error(
      "Somente o dono pode criar canais."
    );
  }

  const channelRef =
    await addDoc(
      collection(
        db,
        "servers",
        serverId,
        "channels"
      ),
      {
        name,
        createdBy: uid,
        createdAt:
          serverTimestamp(),
      }
    );

  return channelRef.id;
}


/* =========================================================
   MENSAGENS DOS CANAIS
   ========================================================= */

export function listenToChannelMessages(
  serverId: string,
  channelId: string,
  callback: (
    messages:
      EliseoChannelMessage[]
  ) => void
): Unsubscribe {
  const q =
    query(
      collection(
        db,
        "servers",
        serverId,
        "channels",
        channelId,
        "messages"
      ),
      orderBy(
        "createdAt",
        "asc"
      )
    );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages =
        snapshot.docs.map(
          (message) => ({
            id: message.id,
            ...message.data(),
          })
        ) as EliseoChannelMessage[];

      callback(messages);
    }
  );
}


/* =========================================================
   ENVIAR MENSAGEM EM CANAL
   ========================================================= */

export async function sendChannelMessage(
  serverId: string,
  channelId: string,
  uid: string,
  text: string,
  media?: EliseoMedia | null
) {
  const cleanText =
    text.trim();

  const hasMedia =
    Boolean(
      media?.url
    );

  if (
    !cleanText &&
    !hasMedia
  ) {
    return;
  }

  const messageData: {
    senderId: string;
    text: string;
    createdAt: any;
    mediaUrl?: string;
    mediaType?: EliseoMediaType;
    mediaKey?: string;
  } = {
    senderId:
      uid,

    text:
      cleanText,

    createdAt:
      serverTimestamp(),
  };

  if (
    hasMedia &&
    media
  ) {
    messageData.mediaUrl =
      media.url;

    messageData.mediaType =
      media.type;

    if (media.key) {
      messageData.mediaKey =
        media.key;
    }
  }

  await addDoc(
    collection(
      db,
      "servers",
      serverId,
      "channels",
      channelId,
      "messages"
    ),
    messageData
  );
}

/* =========================================================
   DRIVE — PASTAS, ARQUIVOS E COTA
   ========================================================= */

export const ELISEO_DRIVE_LIMIT_BYTES =
  5 * 1024 * 1024 * 1024;

export type EliseoDriveFolder = {
  id: string;
  ownerId: string;
  name: string;
  parentId: string | null;
  createdAt?: any;
};

export type EliseoDriveFile = {
  id: string;
  ownerId: string;
  folderId: string | null;
  name: string;
  key: string;
  url: string;
  size: number;
  contentType: string;
  createdAt?: any;
};

function sortDriveItemsByCreatedAt<T extends { createdAt?: any }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const aTime =
      a.createdAt?.toMillis?.() || 0;

    const bTime =
      b.createdAt?.toMillis?.() || 0;

    return bTime - aTime;
  });
}

export function listenToDriveFolders(
  uid: string,
  callback: (
    folders: EliseoDriveFolder[]
  ) => void
): Unsubscribe {
  const q = query(
    collection(db, "driveFolders"),
    where("ownerId", "==", uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const folders =
        snapshot.docs.map(
          (folder) => ({
            id: folder.id,
            ...folder.data(),
          })
        ) as EliseoDriveFolder[];

      callback(
        sortDriveItemsByCreatedAt(
          folders
        )
      );
    }
  );
}

export function listenToDriveFiles(
  uid: string,
  callback: (
    files: EliseoDriveFile[]
  ) => void
): Unsubscribe {
  const q = query(
    collection(db, "driveFiles"),
    where("ownerId", "==", uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const files =
        snapshot.docs.map(
          (file) => ({
            id: file.id,
            ...file.data(),
          })
        ) as EliseoDriveFile[];

      callback(
        sortDriveItemsByCreatedAt(
          files
        )
      );
    }
  );
}

export function listenToDriveUsage(
  uid: string,
  callback: (
    usedBytes: number
  ) => void
): Unsubscribe {
  const ref = doc(
    db,
    "driveUsage",
    uid
  );

  return onSnapshot(
    ref,
    (snapshot) => {
      callback(
        snapshot.exists()
          ? Number(
              snapshot.data()
                .usedBytes || 0
            )
          : 0
      );
    }
  );
}

export async function createDriveFolder(
  uid: string,
  name: string,
  parentId: string | null
) {
  const cleanName =
    name.trim();

  if (!cleanName) {
    throw new Error(
      "Digite um nome para a pasta."
    );
  }

  const ref = await addDoc(
    collection(
      db,
      "driveFolders"
    ),
    {
      ownerId: uid,
      name: cleanName.slice(0, 80),
      parentId,
      createdAt:
        serverTimestamp(),
    }
  );

  return ref.id;
}

export async function reserveDriveBytes(
  uid: string,
  bytes: number
) {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    throw new Error(
      "Tamanho de arquivo inválido."
    );
  }

  const ref = doc(
    db,
    "driveUsage",
    uid
  );

  await runTransaction(
    db,
    async (transaction) => {
      const snapshot =
        await transaction.get(ref);

      const current =
        snapshot.exists()
          ? Number(
              snapshot.data()
                .usedBytes || 0
            )
          : 0;

      const next =
        current + bytes;

      if (
        next >
        ELISEO_DRIVE_LIMIT_BYTES
      ) {
        throw new Error(
          "Seu Drive do Elíseo atingiu o limite de 5 GB."
        );
      }

      transaction.set(
        ref,
        {
          ownerId: uid,
          usedBytes: next,
          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    }
  );
}

export async function releaseDriveBytes(
  uid: string,
  bytes: number
) {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return;
  }

  const ref = doc(
    db,
    "driveUsage",
    uid
  );

  await runTransaction(
    db,
    async (transaction) => {
      const snapshot =
        await transaction.get(ref);

      const current =
        snapshot.exists()
          ? Number(
              snapshot.data()
                .usedBytes || 0
            )
          : 0;

      transaction.set(
        ref,
        {
          ownerId: uid,
          usedBytes:
            Math.max(
              0,
              current - bytes
            ),
          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    }
  );
}

export async function createDriveFileRecord(
  uid: string,
  folderId: string | null,
  file: {
    name: string;
    key: string;
    url: string;
    size: number;
    contentType: string;
  }
) {
  const ref = await addDoc(
    collection(
      db,
      "driveFiles"
    ),
    {
      ownerId: uid,
      folderId,
      name:
        file.name.slice(0, 180),
      key: file.key,
      url: file.url,
      size: file.size,
      contentType:
        file.contentType ||
        "application/octet-stream",
      createdAt:
        serverTimestamp(),
    }
  );

  return ref.id;
}

