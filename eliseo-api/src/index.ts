interface Env {
  ELISEO_DRIVE: R2Bucket;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(
  data: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}

function sanitizeFilename(
  filename: string
) {
  return filename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function allowedImageType(
  type: string
) {
  return [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ].includes(type);
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url =
      new URL(request.url);

    /* =====================================================
       CORS
       ===================================================== */

    if (
      request.method === "OPTIONS"
    ) {
      return new Response(
        null,
        {
          headers:
            corsHeaders,
        }
      );
    }

    /* =====================================================
       HEALTH CHECK
       ===================================================== */

    if (
      url.pathname === "/" &&
      request.method === "GET"
    ) {
      return json({
        ok: true,
        service: "Elíseo API",
        storage: "Cloudflare R2",
      });
    }

    /* =====================================================
       UPLOAD DE MÍDIA

       POST /upload-media
       multipart/form-data

       campos:
       file
       uid
       category
       ===================================================== */

    if (
      url.pathname === "/upload-media" &&
      request.method === "POST"
    ) {
      try {
        const formData =
          await request.formData();

        const fileValue =
          formData.get("file");

        const uid =
          String(
            formData.get("uid") || ""
          );

        const category =
          String(
            formData.get("category") || ""
          );

        if (
          !(fileValue instanceof File)
        ) {
          return json(
            {
              error:
                "Arquivo ausente.",
            },
            400
          );
        }

        if (!uid) {
          return json(
            {
              error:
                "UID ausente.",
            },
            400
          );
        }

        if (
          !["avatar", "post", "gif", "drive"].includes(category)
        ) {
          return json(
            {
              error:
                "Categoria inválida.",
            },
            400
          );
        }

        if (
          category === "drive"
        ) {
          const allowedDriveDocumentTypes =
            new Set([
              "application/pdf",
              "text/html",
              "application/vnd.ms-powerpoint",
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ]);

          if (
            !allowedImageType(
              fileValue.type
            ) &&
            !allowedDriveDocumentTypes.has(
              fileValue.type
            )
          ) {
            return json(
              {
                error:
                  "Tipo de arquivo não permitido.",
              },
              400
            );
          }
        } else if (
          !allowedImageType(
            fileValue.type
          )
        ) {
          return json(
            {
              error:
                "Tipo de imagem não permitido.",
            },
            400
          );
        }

        const MB =
          1024 * 1024;

        if (
          category === "avatar" &&
          fileValue.size > 5 * MB
        ) {
          return json(
            {
              error:
                "Avatar acima de 5 MB.",
            },
            400
          );
        }

        if (
          category === "post" &&
          fileValue.size > 15 * MB
        ) {
          return json(
            {
              error:
                "Imagem acima de 15 MB.",
            },
            400
          );
        }

        if (
          category === "gif" &&
          fileValue.size > 25 * MB
        ) {
          return json(
            {
              error:
                "GIF acima de 25 MB.",
            },
            400
          );
        }

        const safeFilename =
          sanitizeFilename(
            fileValue.name
          );

        const id =
          crypto.randomUUID();

        let folder =
          "posts";

        if (
          category === "avatar"
        ) {
          folder =
            "avatars";
        }

        if (
          category === "gif"
        ) {
          folder =
            "gifs";
        }

        if (
          category === "drive"
        ) {
          folder =
            "drive";
        }

        const key =
          `${folder}/${uid}/${id}-${safeFilename}`;

        await env.ELISEO_DRIVE.put(
          key,
          fileValue.stream(),
          {
            httpMetadata: {
              contentType:
                fileValue.type,
            },

            customMetadata: {
              ownerId:
                uid,

              category,
            },
          }
        );

        const fileUrl =
          `${url.origin}/file/${encodeURIComponent(
            key
          )}`;

        return json({
          ok: true,
          key,
          url: fileUrl,
          size:
            fileValue.size,

          contentType:
            fileValue.type,
        });
      } catch (error) {
        console.error(
          "Erro em /upload-media:",
          error
        );

        return json(
          {
            error:
              "Não foi possível enviar a imagem.",
          },
          500
        );
      }
    }

    /* =====================================================
       ABRIR ARQUIVO
       ===================================================== */

    if (
      url.pathname.startsWith(
        "/file/"
      ) &&
      request.method === "GET"
    ) {
      try {
        const key =
          decodeURIComponent(
            url.pathname.slice(
              "/file/".length
            )
          );

        if (!key) {
          return json(
            {
              error:
                "Arquivo inválido.",
            },
            400
          );
        }

        const object =
          await env.ELISEO_DRIVE.get(
            key
          );

        if (!object) {
          return json(
            {
              error:
                "Arquivo não encontrado.",
            },
            404
          );
        }

        const headers =
          new Headers();

        object.writeHttpMetadata(
          headers
        );

        headers.set(
          "ETag",
          object.httpEtag
        );

        headers.set(
          "Cache-Control",
          "public, max-age=3600"
        );

        Object.entries(
          corsHeaders
        ).forEach(
          ([name, value]) => {
            headers.set(
              name,
              value
            );
          }
        );

        return new Response(
          object.body,
          {
            headers,
          }
        );
      } catch (error) {
        console.error(
          "Erro em /file:",
          error
        );

        return json(
          {
            error:
              "Erro ao abrir arquivo.",
          },
          500
        );
      }
    }

    /* =====================================================
       APAGAR ARQUIVO
       ===================================================== */

    if (
      url.pathname === "/delete-file" &&
      request.method === "POST"
    ) {
      try {
        const body =
          await request.json<{
            key: string;
          }>();

        if (!body.key) {
          return json(
            {
              error:
                "Key ausente.",
            },
            400
          );
        }

        await env.ELISEO_DRIVE.delete(
          body.key
        );

        return json({
          ok: true,
        });
      } catch (error) {
        console.error(
          "Erro em /delete-file:",
          error
        );

        return json(
          {
            error:
              "Não foi possível apagar o arquivo.",
          },
          500
        );
      }
    }

    return json(
      {
        error:
          "Rota não encontrada.",
      },
      404
    );
  },
};