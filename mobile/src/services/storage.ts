import {auth} from './firebase';

const API_URL =
  'https://eliseo-api.eliseeo.workers.dev';

export type EliseoUploadFile = {
  uri: string;
  name: string;
  type: string | null;
  size: number | null;
};

export type UploadedFile = {
  key: string;
  url: string;
  size: number;
  contentType: string;
};

type MediaCategory =
  | 'avatar'
  | 'post'
  | 'gif'
  | 'drive';

async function uploadAttempt(
  uid: string,
  file: EliseoUploadFile,
  category: MediaCategory,
): Promise<UploadedFile> {
  if (!uid) {
    throw new Error(
      'Usuário não autenticado.',
    );
  }

  if (!file.uri) {
    throw new Error(
      'Arquivo inválido.',
    );
  }

  const formData =
    new FormData();

  formData.append(
    'uid',
    uid,
  );

  formData.append(
    'category',
    category,
  );

  formData.append(
    'file',
    {
      uri:
        file.uri,
      name:
        file.name ||
        'arquivo',
      type:
        file.type ||
        'application/octet-stream',
    } as any,
  );

  const response =
    await fetch(
      `${API_URL}/upload-media`,
      {
        method:
          'POST',
        headers: {
          Authorization:
            `Bearer ${await auth.currentUser?.getIdToken() ?? ''}`,
        },
        body:
          formData,
      },
    );

  const data =
    await response
      .json()
      .catch(
        () => ({}),
      );

  if (!response.ok) {
    const error =
      new Error(
        data?.error ||
          'Não foi possível enviar o arquivo.',
      ) as Error & {
        status?: number;
      };

    error.status =
      response.status;

    throw error;
  }

  return {
    key:
      data?.key ??
      '',
    url:
      data?.url ??
      '',
    size:
      Number(
        data?.size ??
          file.size ??
          0,
      ),
    contentType:
      data?.contentType ??
      file.type ??
      'application/octet-stream',
  };
}

export function uploadAvatar(
  uid: string,
  file: EliseoUploadFile,
) {
  return uploadAttempt(
    uid,
    file,
    'avatar',
  );
}

export function uploadPostImage(
  uid: string,
  file: EliseoUploadFile,
) {
  return uploadAttempt(
    uid,
    file,
    'post',
  );
}

export function uploadChatImage(
  uid: string,
  file: EliseoUploadFile,
) {
  return uploadAttempt(
    uid,
    file,
    'post',
  );
}

export function uploadCommunityImage(
  uid: string,
  file: EliseoUploadFile,
) {
  return uploadAttempt(
    uid,
    file,
    'post',
  );
}

function allowedDriveUploadFile(
  file: EliseoUploadFile,
) {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() || '' : '';
  const allowed = ['gif','jpg','jpeg','png','webp','pdf','mp4','webm','mov','m4v','ppt','pptx','html','htm','doc','docx','xls','xlsx','csv','txt','md','zip'];
  return allowed.includes(ext) || type.startsWith('image/') || type.startsWith('video/') || type === 'application/pdf' || type === 'application/vnd.ms-powerpoint' || type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || type === 'text/html' || type === 'application/msword' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || type === 'application/vnd.ms-excel' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || type === 'text/csv' || type === 'text/plain' || type === 'text/markdown' || type === 'application/zip' || type === 'application/x-zip-compressed';
}

export async function uploadDriveFile(
  uid: string,
  file: EliseoUploadFile,
) {
  // ELISEO_PATCH2_DRIVE_CATEGORY: falhas do Worker devem aparecer como falhas do Drive.
  if (!allowedDriveUploadFile(file)) {
    throw new Error('Tipo de arquivo não permitido no Drive.');
  }

  return uploadAttempt(
    uid,
    file,
    'drive',
  );
}

export function getFileUrl(
  key: string,
) {
  return (
    `${API_URL}/file/` +
    encodeURIComponent(
      key,
    )
  );
}

export async function deleteStoredFile(
  key: string,
) {
  if (!key) {
    return;
  }

  const response =
    await fetch(
      `${API_URL}/delete-file`,
      {
        method:
          'POST',
        headers: {
          'Content-Type':
            'application/json',
          Authorization:
            `Bearer ${await auth.currentUser?.getIdToken() ?? ''}`,
        },
        body:
          JSON.stringify({
            key,
          }),
      },
    );

  const data =
    await response
      .json()
      .catch(
        () => ({}),
      );

  if (!response.ok) {
    throw new Error(
      data?.error ||
        'Não foi possível apagar o arquivo.',
    );
  }
}
