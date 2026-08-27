import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from '@react-native-firebase/firestore';

import {
  db,
} from './firebase';

export type AppBackground =
  | 'default'
  | 'white';

export type AppPreferences = {
  background: AppBackground;

  notifications: {
    enabled: boolean;
    dms: boolean;
    servers: boolean;
  };

  settings: {
    showOnlineStatus: boolean;
    dataSaver: boolean;
  };
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  background: 'default',

  notifications: {
    enabled: true,
    dms: true,
    servers: true,
  },

  settings: {
    showOnlineStatus: true,
    dataSaver: false,
  },
};

function normalizePreferences(
  raw: any,
): AppPreferences {
  const app =
    raw?.appPreferences ?? {};

  return {
    background:
      app.background === 'white'
        ? 'white'
        : 'default',

    notifications: {
      enabled:
        app.notifications?.enabled ??
        DEFAULT_APP_PREFERENCES.notifications.enabled,

      dms:
        app.notifications?.dms ??
        DEFAULT_APP_PREFERENCES.notifications.dms,

      servers:
        app.notifications?.servers ??
        DEFAULT_APP_PREFERENCES.notifications.servers,
    },

    settings: {
      showOnlineStatus:
        app.settings?.showOnlineStatus ??
        DEFAULT_APP_PREFERENCES.settings.showOnlineStatus,

      dataSaver:
        app.settings?.dataSaver ??
        DEFAULT_APP_PREFERENCES.settings.dataSaver,
    },
  };
}

export function listenToAppPreferences(
  uid: string,
  callback: (
    preferences: AppPreferences,
  ) => void,
) {
  const userRef =
    doc(
      db,
      'users',
      uid,
    );

  return onSnapshot(
    userRef,
    snapshot => {
      callback(
        normalizePreferences(
          snapshot.data(),
        ),
      );
    },
  );
}

export async function setAppBackground(
  uid: string,
  background: AppBackground,
) {
  await updateDoc(
    doc(
      db,
      'users',
      uid,
    ),
    {
      'appPreferences.background':
        background,

      'appPreferences.updatedAt':
        serverTimestamp(),
    },
  );
}

export async function setNotificationsEnabled(
  uid: string,
  enabled: boolean,
) {
  await updateDoc(
    doc(
      db,
      'users',
      uid,
    ),
    {
      'appPreferences.notifications.enabled':
        enabled,

      'appPreferences.updatedAt':
        serverTimestamp(),
    },
  );
}

export async function setDmNotificationsEnabled(
  uid: string,
  enabled: boolean,
) {
  await updateDoc(
    doc(
      db,
      'users',
      uid,
    ),
    {
      'appPreferences.notifications.dms':
        enabled,

      'appPreferences.updatedAt':
        serverTimestamp(),
    },
  );
}

export async function setServerNotificationsEnabled(
  uid: string,
  enabled: boolean,
) {
  await updateDoc(
    doc(
      db,
      'users',
      uid,
    ),
    {
      'appPreferences.notifications.servers':
        enabled,

      'appPreferences.updatedAt':
        serverTimestamp(),
    },
  );
}

export async function setShowOnlineStatus(
  uid: string,
  enabled: boolean,
) {
  await updateDoc(
    doc(
      db,
      'users',
      uid,
    ),
    {
      'appPreferences.settings.showOnlineStatus':
        enabled,

      'appPreferences.updatedAt':
        serverTimestamp(),
    },
  );
}

export async function setDataSaver(
  uid: string,
  enabled: boolean,
) {
  await updateDoc(
    doc(
      db,
      'users',
      uid,
    ),
    {
      'appPreferences.settings.dataSaver':
        enabled,

      'appPreferences.updatedAt':
        serverTimestamp(),
    },
  );
}
