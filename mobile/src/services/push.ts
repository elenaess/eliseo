import {
  PermissionsAndroid,
  Platform,
} from 'react-native';

import {
  getMessaging,
  type RemoteMessage,
} from '@react-native-firebase/messaging';

import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';

import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

import {
  auth,
  db,
} from './firebase';

const messagingInstance =
  getMessaging();

const PUSH_WORKER_URL =
  'https://eliseo-push.eliseeo.workers.dev';

const CHANNEL_ID =
  'eliseo-messages';

let foregroundStop:
  | (() => void)
  | null = null;

let tokenRefreshStop:
  | (() => void)
  | null = null;

let currentUid = '';
let currentToken = '';
let backgroundRegistered = false;

function tokenDocId(
  token: string,
) {
  return encodeURIComponent(
    token,
  );
}

async function ensureChannel() {
  await notifee.createChannel({
    id:
      CHANNEL_ID,
    name:
      'Mensagens e chamadas',
    importance:
      AndroidImportance.HIGH,
    vibration:
      true,
  });
}

async function requestAndroidPermission() {
  if (
    Platform.OS !== 'android'
  ) {
    return true;
  }

  if (
    Number(
      Platform.Version,
    ) < 33
  ) {
    return true;
  }

  const permission =
    PermissionsAndroid
      .PERMISSIONS
      .POST_NOTIFICATIONS;

  if (!permission) {
    return true;
  }

  const alreadyGranted =
    await PermissionsAndroid
      .check(
        permission,
      );

  if (alreadyGranted) {
    return true;
  }

  const result =
    await PermissionsAndroid
      .request(
        permission,
      );

  return (
    result ===
    PermissionsAndroid
      .RESULTS
      .GRANTED
  );
}

async function saveToken(
  uid: string,
  token: string,
) {
  if (!uid || !token) {
    return;
  }

  await setDoc(
    doc(
      db,
      'users',
      uid,
      'devices',
      tokenDocId(token),
    ),
    {
      token,
      platform:
        Platform.OS,
      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  currentUid = uid;
  currentToken = token;
}

async function deleteTokenMapping(
  uid: string,
  token: string,
) {
  if (!uid || !token) {
    return;
  }

  try {
    await deleteDoc(
      doc(
        db,
        'users',
        uid,
        'devices',
        tokenDocId(token),
      ),
    );
  } catch {
    // Logout nÃƒÂ£o pode falhar por causa de push.
  }
}

async function displayRemoteMessage(
  remoteMessage: RemoteMessage,
) {
  const data =
    remoteMessage?.data ??
    {};

  /* ELISEO_PUSH_EXTERNAL_V2 */
  const notification =
    remoteMessage?.notification ??
    {};

  const title =
    typeof data.title === 'string' &&
    data.title
      ? data.title
      : typeof notification.title === 'string' &&
          notification.title
        ? notification.title
        : 'Elíseo';

  const body =
    typeof data.body === 'string' &&
    data.body
      ? data.body
      : typeof notification.body === 'string'
        ? notification.body
        : '';

  if (!body) {
    return;
  }

  await ensureChannel();

  const largeIcon =
    typeof data.largeIcon === 'string' &&
    /^https?:\/\//i.test(
      data.largeIcon,
    )
      ? data.largeIcon
      : undefined;

  await notifee.displayNotification({
    title,
    body,
    data,
    android: {
      channelId:
        CHANNEL_ID,
      smallIcon:
        'ic_stat_eliseo',
      largeIcon,
      importance:
        AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
    },
  });
}

export function registerPushBackgroundHandler() {
  if (backgroundRegistered) {
    return;
  }

  backgroundRegistered = true;

  messagingInstance
    .setBackgroundMessageHandler(
      async remoteMessage => {
        if (
          remoteMessage?.notification
        ) {
          return;
        }

        await displayRemoteMessage(
          remoteMessage,
        );
      },
    );
}

export async function startPushForUser(
  uid: string,
) {
  stopPushListeners();

  if (!uid) {
    return;
  }

  try {
    const granted =
      await requestAndroidPermission();

    if (!granted) {
      return;
    }

    const notificationSettings =
      await notifee.requestPermission();

    if (
      notificationSettings
        .authorizationStatus ===
      AuthorizationStatus.DENIED
    ) {
      console.warn(
        '[Elíseo push] notificações bloqueadas no Android',
      );

      return;
    }

    await ensureChannel();

    if (
      !messagingInstance
        .isDeviceRegisteredForRemoteMessages
    ) {
      await messagingInstance
        .registerDeviceForRemoteMessages();
    }

    const token =
      await messagingInstance
        .getToken();

    await saveToken(
      uid,
      token,
    );

    tokenRefreshStop =
      messagingInstance
        .onTokenRefresh(
          async nextToken => {
            const previousToken =
              currentToken;

            if (
              previousToken &&
              previousToken !== nextToken
            ) {
              await deleteTokenMapping(
                uid,
                previousToken,
              );
            }

            await saveToken(
              uid,
              nextToken,
            );
          },
        );

    foregroundStop =
      messagingInstance
        .onMessage(
          async remoteMessage => {
            await displayRemoteMessage(
              remoteMessage,
            );
          },
        );
  } catch (caught) {
    console.warn(
      '[ElÃƒÂ­seo push] registro falhou',
      caught,
    );
  }
}

export function stopPushListeners() {
  foregroundStop?.();
  foregroundStop = null;

  tokenRefreshStop?.();
  tokenRefreshStop = null;
}

export async function unregisterPushForUser(
  uid: string,
) {
  stopPushListeners();

  const token =
    currentUid === uid &&
    currentToken
      ? currentToken
      : await messagingInstance
          .getToken()
          .catch(
            () => '',
          );

  await deleteTokenMapping(
    uid,
    token,
  );

  if (currentUid === uid) {
    currentUid = '';
    currentToken = '';
  }
}

type WorkerBody =
  Record<
    string,
    string
  >;

async function postPushEvent(
  path: string,
  body: WorkerBody,
) {
  try {
    const user =
      auth.currentUser;

    if (!user) {
      return false;
    }

    const idToken =
      await user.getIdToken();

    const response =
      await fetch(
        `${PUSH_WORKER_URL}${path}`,
        {
          method: 'POST',
          headers: {
            Authorization:
              `Bearer ${idToken}`,
            'Content-Type':
              'application/json',
          },
          body:
            JSON.stringify(
              body,
            ),
        },
      );

    if (!response.ok) {
      const responseText =
        await response
          .text()
          .catch(
            () => '',
          );

      console.warn(
        '[Elíseo push] Worker rejeitou evento',
        response.status,
        responseText.slice(
          0,
          300,
        ),
      );

      return false;
    }

    return true;
  } catch (caught) {
    console.warn(
      '[ElÃƒÂ­seo push] evento nÃƒÂ£o enviado',
      caught,
    );

    return false;
  }
}

export function notifyDmMessage({
  conversationId,
  messageId,
}: {
  conversationId: string;
  messageId: string;
}) {
  return postPushEvent(
    '/v1/dm-message',
    {
      conversationId,
      messageId,
    },
  );
}

export function notifyServerMessage({
  serverId,
  channelId,
  messageId,
}: {
  serverId: string;
  channelId: string;
  messageId: string;
}) {
  return postPushEvent(
    '/v1/server-message',
    {
      serverId,
      channelId,
      messageId,
    },
  );
}

export function notifyDmCallJoin({
  conversationId,
  roomId,
  sessionId,
}: {
  conversationId: string;
  roomId: string;
  sessionId: string;
}) {
  return postPushEvent(
    '/v1/dm-call-join',
    {
      conversationId,
      roomId,
      sessionId,
    },
  );
}
