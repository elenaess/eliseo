import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase";
export { isAllowedDriveUpload, fileKind, formatBytes } from "./pure";

export function listenToDriveFavorites(uid: string, callback: (ids: string[]) => void) {
  return onSnapshot(collection(db, "users", uid, "driveFavorites"), (snapshot) => {
    callback(snapshot.docs.map((item) => item.id));
  });
}

export async function toggleDriveFileFavorite(
  uid: string,
  fileId: string,
  favorite: boolean,
) {
  const ref = doc(db, "users", uid, "driveFavorites", fileId);
  if (!favorite) {
    await deleteDoc(ref);
    return;
  }
  await setDoc(ref, {fileId, savedAt: serverTimestamp()});
}

export async function deleteDriveFileRecord(fileId: string) {
  await deleteDoc(doc(db, "driveFiles", fileId));
}
