import {useEffect} from "react";

import {
  listenToAppPreferences,
} from "./preferencesService";
import {
  handleSpotifyCallbackFromLocation,
  startWebMusicPresenceSync,
  stopWebMusicPresenceSync,
} from "./musicService";
import {updateUserStatus} from "./profileService";
import {listenToNotificationFeed} from "./notificationsService";

export function DesktopRuntimeBridge({uid}: {uid: string}) {
  useEffect(() => {
    if (!uid) return;

    let showOnline = true;
    let notificationsEnabled = true;
    let firstNotificationSnapshot = true;
    const knownNotifications = new Set<string>();
    const stopPreferences = listenToAppPreferences(uid, (preferences) => {
      showOnline = preferences.settings.showOnlineStatus;
      notificationsEnabled = preferences.notifications.enabled;
      document.documentElement.dataset.eliseoTheme =
        preferences.background === "white" ? "white" : "default";
      void updateUserStatus(uid, showOnline ? "online" : "offline").catch(() => {});
    });

    const stopNotifications = listenToNotificationFeed(uid, (items) => {
      if (firstNotificationSnapshot) {
        items.forEach((item) => knownNotifications.add(item.id));
        firstNotificationSnapshot = false;
        return;
      }
      if (!notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
      for (const item of items) {
        if (knownNotifications.has(item.id)) continue;
        knownNotifications.add(item.id);
        try { new Notification(item.title, {body: item.body, tag: item.id}); } catch {}
      }
    });

    void handleSpotifyCallbackFromLocation(uid).catch(() => {});
    startWebMusicPresenceSync(uid);

    const onVisibility = () => {
      if (document.visibilityState === "visible" && showOnline) {
        void updateUserStatus(uid, "online").catch(() => {});
      }
    };
    const onBeforeUnload = () => {
      void updateUserStatus(uid, "offline").catch(() => {});
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      stopPreferences();
      stopNotifications();
      stopWebMusicPresenceSync();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      void updateUserStatus(uid, "offline").catch(() => {});
    };
  }, [uid]);

  return null;
}
