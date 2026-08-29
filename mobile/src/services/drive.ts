import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from '@react-native-firebase/firestore';

import {
  db,
} from './firebase';

/* =========================================================
   CONFIG
   ========================================================= */

export const ELISEO_DRIVE_LIMIT_BYTES =
  5 *
  1024 *
  1024 *
  1024;

/* =========================================================
   TIPOS
   ========================================================= */

export type EliseoDriveFolder = {
  id: string;

  ownerId: string;

  name: string;

  parentId:
    string |
    null;

  createdAt?: any;
};

export type EliseoDriveFile = {
  id: string;

  ownerId: string;

  folderId:
    string |
    null;

  name: string;

  key: string;

  url: string;

  size: number;

  contentType: string;

  createdAt?: any;
};

/* =========================================================
   HELPERS
   ========================================================= */

function createdAtValue(
  value: any,
) {
  return (
    value
      ?.toMillis?.() ??
    0
  );
}

function sortNewestFirst<
  T extends {
    createdAt?: any;
  },
>(
  items: T[],
) {
  return [
    ...items,
  ].sort(
    (
      a,
      b,
    ) =>
      createdAtValue(
        b.createdAt,
      ) -
      createdAtValue(
        a.createdAt,
      ),
  );
}

export function isAllowedDriveUpload(
  name: string,
  contentType?: string | null,
) {
  const lowerName = name.toLowerCase();
  const type = (contentType || '').toLowerCase();
  const allowedExtensions = ['gif','jpg','jpeg','png','webp','pdf','mp4','webm','mov','m4v','ppt','pptx','html','htm','doc','docx','xls','xlsx','csv','txt','md','zip'];
  const ext = lowerName.includes('.') ? lowerName.split('.').pop() || '' : '';
  if (allowedExtensions.includes(ext)) return true;
  return type.startsWith('image/') || type.startsWith('video/') || type === 'application/pdf' || type === 'application/vnd.ms-powerpoint' || type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || type === 'text/html' || type === 'application/msword' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || type === 'application/vnd.ms-excel' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || type === 'text/csv' || type === 'text/plain' || type === 'text/markdown' || type === 'application/zip' || type === 'application/x-zip-compressed';
}

export function listenToDriveFavorites(uid: string, callback: (ids: string[]) => void) {
  return onSnapshot(
    collection(db, 'users', uid, 'driveFavorites'),
    snapshot => callback(snapshot.docs.map(item => item.id)),
  );
}

export async function toggleDriveFileFavorite(uid: string, fileId: string, favorite: boolean) {
  const ref = doc(db, 'users', uid, 'driveFavorites', fileId);
  if (!favorite) {
    await deleteDoc(ref);
    return;
  }
  await setDoc(ref, {fileId, savedAt: serverTimestamp()});
}

/* =========================================================
   PASTAS
   ========================================================= */

export function listenToDriveFolders(
  uid: string,

  callback: (
    folders:
      EliseoDriveFolder[],
  ) => void,
) {
  const foldersQuery =
    query(
      collection(
        db,
        'driveFolders',
      ),

      where(
        'ownerId',
        '==',
        uid,
      ),
    );

  return onSnapshot(
    foldersQuery,

    snapshot => {
      const folders =
        snapshot.docs.map(
          folderDoc => {
            const data =
              folderDoc.data();

            return {
              id:
                folderDoc.id,

              ownerId:
                data?.ownerId ??
                '',

              name:
                data?.name ??
                'Pasta',

              parentId:
                data?.parentId ??
                null,

              createdAt:
                data?.createdAt ??
                null,
            } as EliseoDriveFolder;
          },
        );

      callback(
        sortNewestFirst(
          folders,
        ),
      );
    },
  );
}

/* =========================================================
   CRIAR PASTA
   ========================================================= */

export async function createDriveFolder(
  uid: string,

  name: string,

  parentId:
    string |
    null,
) {
  const cleanName =
    name.trim();

  if (
    !cleanName
  ) {
    throw new Error(
      'Digite um nome para a pasta.',
    );
  }

  if (
    cleanName.length >
    80
  ) {
    throw new Error(
      'O nome pode ter no máximo 80 caracteres.',
    );
  }

  const folderRef =
    await addDoc(
      collection(
        db,
        'driveFolders',
      ),

      {
        ownerId:
          uid,

        name:
          cleanName,

        parentId,

        createdAt:
          serverTimestamp(),
      },
    );

  return folderRef.id;
}

/* =========================================================
   ARQUIVOS
   ========================================================= */

export function listenToDriveFiles(
  uid: string,

  callback: (
    files:
      EliseoDriveFile[],
  ) => void,
) {
  const filesQuery =
    query(
      collection(
        db,
        'driveFiles',
      ),

      where(
        'ownerId',
        '==',
        uid,
      ),
    );

  return onSnapshot(
    filesQuery,

    snapshot => {
      const files =
        snapshot.docs.map(
          fileDoc => {
            const data =
              fileDoc.data();

            return {
              id:
                fileDoc.id,

              ownerId:
                data?.ownerId ??
                '',

              folderId:
                data?.folderId ??
                null,

              name:
                data?.name ??
                'Arquivo',

              key:
                data?.key ??
                '',

              url:
                data?.url ??
                '',

              size:
                Number(
                  data?.size ??
                    0,
                ),

              contentType:
                data?.contentType ??
                'application/octet-stream',

              createdAt:
                data?.createdAt ??
                null,
            } as EliseoDriveFile;
          },
        );

      callback(
        sortNewestFirst(
          files,
        ),
      );
    },
  );
}

/* =========================================================
   CRIAR REGISTRO DE ARQUIVO
   ========================================================= */

export async function createDriveFileRecord(
  uid: string,

  folderId:
    string |
    null,

  file: {
    name: string;

    key: string;

    url: string;

    size: number;

    contentType:
      string;
  },
) {
  const cleanName =
    file.name
      .trim()
      .slice(
        0,
        180,
      );

  if (
    !cleanName
  ) {
    throw new Error(
      'Nome de arquivo inválido.',
    );
  }

  if (
    !file.key
  ) {
    throw new Error(
      'Chave do arquivo inválida.',
    );
  }

  if (
    !file.url
  ) {
    throw new Error(
      'URL do arquivo inválida.',
    );
  }

  if (
    !Number.isFinite(
      file.size,
    ) ||
    file.size <=
      0
  ) {
    throw new Error(
      'Tamanho de arquivo inválido.',
    );
  }

  const fileRef =
    await addDoc(
      collection(
        db,
        'driveFiles',
      ),

      {
        ownerId:
          uid,

        folderId,

        name:
          cleanName,

        key:
          file.key,

        url:
          file.url,

        size:
          file.size,

        contentType:
          file.contentType ||
          'application/octet-stream',

        createdAt:
          serverTimestamp(),
      },
    );

  return fileRef.id;
}

/* =========================================================
   USO
   ========================================================= */

export function listenToDriveUsage(
  uid: string,

  callback: (
    usedBytes:
      number,
  ) => void,
) {
  return onSnapshot(
    doc(
      db,
      'driveUsage',
      uid,
    ),

    snapshot => {
      if (
        !snapshot.exists()
      ) {
        callback(
          0,
        );

        return;
      }

      callback(
        Number(
          snapshot.data()
            ?.usedBytes ??
            0,
        ),
      );
    },
  );
}

/* =========================================================
   RESERVAR ESPAÇO
   ========================================================= */

export async function reserveDriveBytes(
  uid: string,

  bytes: number,
) {
  if (
    !Number.isFinite(
      bytes,
    ) ||
    bytes <=
      0
  ) {
    throw new Error(
      'Tamanho de arquivo inválido.',
    );
  }

  if (
    bytes >
    ELISEO_DRIVE_LIMIT_BYTES
  ) {
    throw new Error(
      'Esse arquivo sozinho ultrapassa o limite de 5 GB.',
    );
  }

  const usageRef =
    doc(
      db,
      'driveUsage',
      uid,
    );

  await runTransaction(
    db,

    async transaction => {
      const snapshot =
        await transaction.get(
          usageRef,
        );

      const current =
        snapshot.exists()
          ? Number(
              snapshot.data()
                ?.usedBytes ??
                0,
            )
          : 0;

      const next =
        current +
        bytes;

      if (
        next >
        ELISEO_DRIVE_LIMIT_BYTES
      ) {
        throw new Error(
          'Seu Drive do Elíseo atingiu o limite de 5 GB.',
        );
      }

      transaction.set(
        usageRef,

        {
          ownerId:
            uid,

          usedBytes:
            next,

          updatedAt:
            serverTimestamp(),
        },

        {
          merge:
            true,
        },
      );
    },
  );
}

/* =========================================================
   LIBERAR ESPAÇO
   ========================================================= */

export async function releaseDriveBytes(
  uid: string,

  bytes: number,
) {
  if (
    !Number.isFinite(
      bytes,
    ) ||
    bytes <=
      0
  ) {
    return;
  }

  const usageRef =
    doc(
      db,
      'driveUsage',
      uid,
    );

  await runTransaction(
    db,

    async transaction => {
      const snapshot =
        await transaction.get(
          usageRef,
        );

      const current =
        snapshot.exists()
          ? Number(
              snapshot.data()
                ?.usedBytes ??
                0,
            )
          : 0;

      transaction.set(
        usageRef,

        {
          ownerId:
            uid,

          usedBytes:
            Math.max(
              0,
              current -
                bytes,
            ),

          updatedAt:
            serverTimestamp(),
        },

        {
          merge:
            true,
        },
      );
    },
  );
}