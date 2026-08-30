import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import {
  normalizeAppPreferences,
  type AppBackground,
  type AppPreferences,
} from "./pure";

export type { AppBackground, AppPreferences } from "./pure";
export { DEFAULT_APP_PREFERENCES } from "./pure";

export function listenToAppPreferences(
  uid: string,
  callback: (preferences: AppPreferences) => void,
) {
  return onSnapshot(doc(db, "users", uid), (snapshot) => {
    callback(normalizeAppPreferences(snapshot.data()));
  });
}

async function updatePreference(uid: string, field: string, value: unknown) {
  await updateDoc(doc(db, "users", uid), {
    [field]: value,
    "appPreferences.updatedAt": serverTimestamp(),
  });
}

export function setAppBackground(uid: string, background: AppBackground) {
  return updatePreference(uid, "appPreferences.background", background);
}

export function setNotificationsEnabled(uid: string, enabled: boolean) {
  return updatePreference(uid, "appPreferences.notifications.enabled", enabled);
}

export function setDmNotificationsEnabled(uid: string, enabled: boolean) {
  return updatePreference(uid, "appPreferences.notifications.dms", enabled);
}

export function setServerNotificationsEnabled(uid: string, enabled: boolean) {
  return updatePreference(uid, "appPreferences.notifications.servers", enabled);
}

export function setShowOnlineStatus(uid: string, enabled: boolean) {
  return updatePreference(uid, "appPreferences.settings.showOnlineStatus", enabled);
}

export function setDataSaver(uid: string, enabled: boolean) {
  return updatePreference(uid, "appPreferences.settings.dataSaver", enabled);
}
