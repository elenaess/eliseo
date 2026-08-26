const API_URL =
  "https://eliseo-api.eliseeo.workers.dev";

export type MediaCategory =
  | "avatar"
  | "post"
  | "gif";

export type UploadedFile = {
  key: string;
  url: string;
  size: number;
  contentType: string;
};

export async function uploadMedia(
  uid: string,
  file: File,
  category: MediaCategory
): Promise<UploadedFile> {
  const formData =
    new FormData();

  formData.append(
    "uid",
    uid
  );

  formData.append(
    "category",
    category
  );

  formData.append(
    "file",
    file
  );

  const response =
    await fetch(
      `${API_URL}/upload-media`,
      {
        method: "POST",
        body: formData,
      }
    );

  const data =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Não foi possível enviar o arquivo."
    );
  }

  return data as UploadedFile;
}

export async function uploadAvatar(
  uid: string,
  file: File
) {
  return uploadMedia(
    uid,
    file,
    "avatar"
  );
}

export async function uploadPostImage(
  uid: string,
  file: File
) {
  return uploadMedia(
    uid,
    file,
    "post"
  );
}

export async function uploadGif(
  uid: string,
  file: File
) {
  return uploadMedia(
    uid,
    file,
    "gif"
  );
}

export function getFileUrl(
  key: string
) {
  return `${API_URL}/file/${encodeURIComponent(
    key
  )}`;
}

export async function deleteStoredFile(
  key: string
) {
  const response =
    await fetch(
      `${API_URL}/delete-file`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          key,
        }),
      }
    );

  if (!response.ok) {
    const data =
      await response
        .json()
        .catch(
          () => ({})
        );

    throw new Error(
      data.error ||
        "Não foi possível apagar o arquivo."
    );
  }
}
export async function uploadCommunityImage(
  uid: string,
  file: File
) {
  return uploadPostImage(
    uid,
    file
  );
}

/* =========================================================
   DRIVE
   ========================================================= */

async function uploadDriveAttempt(
  uid: string,
  file: File,
  category: string
): Promise<UploadedFile> {
  const formData =
    new FormData();

  formData.append(
    "uid",
    uid
  );

  formData.append(
    "category",
    category
  );

  formData.append(
    "file",
    file
  );

  const response =
    await fetch(
      `${API_URL}/upload-media`,
      {
        method: "POST",
        body: formData,
      }
    );

  const data =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    const error = new Error(
      data.error ||
        "Não foi possível enviar o arquivo para o Drive."
    ) as Error & {
      status?: number;
    };

    error.status =
      response.status;

    throw error;
  }

  return data as UploadedFile;
}

export async function uploadDriveFile(
  uid: string,
  file: File
) {
  try {
    /*
     * Primeiro tenta a categoria própria do Drive.
     * Se o Worker atual ainda não conhecer "drive",
     * reaproveitamos o pipeline de upload já existente.
     */
    return await uploadDriveAttempt(
      uid,
      file,
      "drive"
    );
  } catch (caught) {
    const status =
      (caught as { status?: number })
        ?.status;

    if (
      status !== 400 &&
      status !== 404 &&
      status !== 422
    ) {
      throw caught;
    }

    return uploadDriveAttempt(
      uid,
      file,
      "post"
    );
  }
}

