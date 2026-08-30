import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import type { EliseoUser } from "../firestore";
import type { MusicActivity, MusicProvider } from "./musicService";

export type PresenceStatus = "online" | "busy" | "offline";

export type ExtendedUserProfile = EliseoUser & {
  banner?: string;
  course?: string;
  institutionalEmail?: string;
  institutionDomain?: string;
  institutionName?: string;
  institutionTag?: string;
  status?: PresenceStatus;
  musicProvider?: MusicProvider;
  musicActivity?: MusicActivity | null;
};

function normalizeStatus(value: unknown): PresenceStatus {
  return value === "online" || value === "busy" || value === "offline"
    ? value
    : "offline";
}

function mapProfile(uid: string, data: any): ExtendedUserProfile {
  return {
    uid,
    email: data?.email ?? "",
    username: data?.username ?? "",
    avatar: data?.avatar ?? "",
    bio: data?.bio ?? "",
    banner: data?.banner ?? "",
    course: data?.course ?? "",
    institutionalEmail: data?.institutionalEmail ?? "",
    institutionDomain: data?.institutionDomain ?? "",
    institutionName: data?.institutionName ?? "",
    institutionTag: data?.institutionTag ?? "",
    status: normalizeStatus(data?.status),
    musicProvider:
      data?.musicProvider === "spotify" ||
      data?.musicProvider === "youtube_music" ||
      data?.musicProvider === "qobuz"
        ? data.musicProvider
        : null,
    musicActivity: data?.musicActivity ?? null,
  };
}

export function listenToExtendedProfile(
  uid: string,
  callback: (profile: ExtendedUserProfile | null) => void,
) {
  return onSnapshot(doc(db, "users", uid), (snapshot) => {
    callback(snapshot.exists() ? mapProfile(snapshot.id, snapshot.data()) : null);
  });
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
  const update: Record<string, unknown> = {updatedAt: serverTimestamp()};
  if (values.course !== undefined) update.course = values.course.trim().slice(0, 80);
  for (const key of [
    "institutionalEmail",
    "institutionDomain",
    "institutionName",
    "institutionTag",
  ] as const) {
    if (values[key] !== undefined) update[key] = values[key]?.trim() ?? "";
  }
  await updateDoc(doc(db, "users", uid), update);
}

export async function updateUserBanner(uid: string, bannerUrl: string) {
  await updateDoc(doc(db, "users", uid), {
    banner: bannerUrl,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserStatus(uid: string, status: PresenceStatus) {
  await updateDoc(doc(db, "users", uid), {
    status: normalizeStatus(status),
    updatedAt: serverTimestamp(),
  });
}
