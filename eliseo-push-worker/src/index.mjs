import {
  SignJWT,
  decodeProtectedHeader,
  importPKCS8,
  importX509,
  jwtVerify,
} from 'jose';

import {
  assertShortId,
  buildNotification,
  callDedupeKey,
  chunk,
  preferencesAllow,
} from './core.mjs';

const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

const OAUTH_TOKEN_URL =
  'https://oauth2.googleapis.com/token';

const GOOGLE_SCOPE = [
  'https://www.googleapis.com/auth/firebase.messaging',
  'https://www.googleapis.com/auth/datastore',
].join(' ');

let certCache = {
  expiresAt: 0,
  values: null,
};

let accessTokenCache = {
  expiresAt: 0,
  value: '',
};

function json(
  body,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'content-type':
          'application/json; charset=utf-8',
        'cache-control':
          'no-store',
      },
    },
  );
}

function normalizePrivateKey(
  value,
) {
  return String(value ?? '')
    .replace(/\\n/g, '\n')
    .trim();
}

function parseMaxAge(
  value,
) {
  const match =
    String(value ?? '')
      .match(/max-age=(\d+)/i);

  return match
    ? Number(match[1])
    : 3600;
}

async function getFirebaseCertificates() {
  const now =
    Date.now();

  if (
    certCache.values &&
    certCache.expiresAt >
      now + 30_000
  ) {
    return certCache.values;
  }

  const response =
    await fetch(
      FIREBASE_CERTS_URL,
    );

  if (!response.ok) {
    throw new Error(
      'Não foi possível carregar as chaves públicas do Firebase.',
    );
  }

  const values =
    await response.json();

  const maxAge =
    parseMaxAge(
      response.headers.get(
        'cache-control',
      ),
    );

  certCache = {
    values,
    expiresAt:
      now +
      maxAge * 1000,
  };

  return values;
}

async function verifyFirebaseIdToken(
  token,
  projectId,
) {
  if (!token) {
    throw new Error(
      'Token ausente.',
    );
  }

  const header =
    decodeProtectedHeader(
      token,
    );

  if (
    header.alg !== 'RS256' ||
    !header.kid
  ) {
    throw new Error(
      'Token Firebase inválido.',
    );
  }

  const certs =
    await getFirebaseCertificates();

  const certificate =
    certs?.[header.kid];

  if (!certificate) {
    throw new Error(
      'Chave do token Firebase não reconhecida.',
    );
  }

  const key =
    await importX509(
      certificate,
      'RS256',
    );

  const {
    payload,
  } = await jwtVerify(
    token,
    key,
    {
      algorithms: [
        'RS256',
      ],
      audience:
        projectId,
      issuer:
        `https://securetoken.google.com/${projectId}`,
    },
  );

  const now =
    Math.floor(
      Date.now() /
      1000,
    );

  if (
    typeof payload.sub !== 'string' ||
    !payload.sub ||
    payload.sub.length > 128 ||
    typeof payload.iat !== 'number' ||
    payload.iat > now + 60 ||
    typeof payload.auth_time !== 'number' ||
    payload.auth_time > now + 60
  ) {
    throw new Error(
      'Claims do token Firebase inválidas.',
    );
  }

  return {
    uid:
      payload.sub,
    payload,
  };
}

async function getServiceAccessToken(
  env,
) {
  const now =
    Date.now();

  if (
    accessTokenCache.value &&
    accessTokenCache.expiresAt >
      now + 60_000
  ) {
    return accessTokenCache.value;
  }

  const clientEmail =
    String(
      env.FIREBASE_CLIENT_EMAIL ??
      '',
    ).trim();

  const privateKey =
    normalizePrivateKey(
      env.FIREBASE_PRIVATE_KEY,
    );

  if (
    !clientEmail ||
    !privateKey
  ) {
    throw new Error(
      'Secrets Firebase do Worker não configurados.',
    );
  }

  const key =
    await importPKCS8(
      privateKey,
      'RS256',
    );

  const assertion =
    await new SignJWT({
      scope:
        GOOGLE_SCOPE,
    })
      .setProtectedHeader({
        alg: 'RS256',
        typ: 'JWT',
      })
      .setIssuer(
        clientEmail,
      )
      .setAudience(
        OAUTH_TOKEN_URL,
      )
      .setIssuedAt()
      .setExpirationTime(
        '1h',
      )
      .sign(key);

  const response =
    await fetch(
      OAUTH_TOKEN_URL,
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/x-www-form-urlencoded',
        },
        body:
          new URLSearchParams({
            grant_type:
              'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
          }),
      },
    );

  const data =
    await response
      .json()
      .catch(
        () => ({}),
      );

  if (
    !response.ok ||
    !data?.access_token
  ) {
    throw new Error(
      data?.error_description ||
      'Não foi possível obter token OAuth do Firebase.',
    );
  }

  accessTokenCache = {
    value:
      data.access_token,
    expiresAt:
      now +
      Number(
        data.expires_in ??
        3600,
      ) *
        1000,
  };

  return accessTokenCache.value;
}

function firestorePath(
  path,
) {
  return String(path)
    .split('/')
    .map(part =>
      encodeURIComponent(
        part,
      ),
    )
    .join('/');
}

function decodeValue(
  value,
) {
  if (!value) {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'nullValue',
    )
  ) {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'stringValue',
    )
  ) {
    return value.stringValue;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'booleanValue',
    )
  ) {
    return value.booleanValue;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'integerValue',
    )
  ) {
    return Number(
      value.integerValue,
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'doubleValue',
    )
  ) {
    return Number(
      value.doubleValue,
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'timestampValue',
    )
  ) {
    return value.timestampValue;
  }

  if (value.arrayValue) {
    return (
      value.arrayValue.values ??
      []
    ).map(
      decodeValue,
    );
  }

  if (value.mapValue) {
    return decodeFields(
      value.mapValue.fields ??
      {},
    );
  }

  return null;
}

function decodeFields(
  fields,
) {
  return Object.fromEntries(
    Object.entries(
      fields ?? {},
    ).map(
      ([key, value]) => [
        key,
        decodeValue(value),
      ],
    ),
  );
}

function decodeDocument(
  document,
) {
  if (!document) {
    return null;
  }

  return {
    id:
      String(document.name ?? '')
        .split('/')
        .pop() ?? '',
    path:
      String(document.name ?? '')
        .split('/documents/')[1] ??
      '',
    ...decodeFields(
      document.fields ??
      {},
    ),
  };
}

async function firestoreFetch(
  env,
  path,
  init = {},
) {
  const accessToken =
    await getServiceAccessToken(
      env,
    );

  return fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      env.FIREBASE_PROJECT_ID,
    )}/databases/(default)/documents/${firestorePath(
      path,
    )}`,
    {
      ...init,
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
        ...(init.headers ?? {}),
      },
    },
  );
}

async function getDocument(
  env,
  path,
) {
  const response =
    await firestoreFetch(
      env,
      path,
    );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Firestore ${response.status}: ${text.slice(0, 240)}`,
    );
  }

  return decodeDocument(
    await response.json(),
  );
}

async function listDocuments(
  env,
  collectionPath,
) {
  const accessToken =
    await getServiceAccessToken(
      env,
    );

  const url =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      env.FIREBASE_PROJECT_ID,
    )}/databases/(default)/documents/${firestorePath(
      collectionPath,
    )}?pageSize=100`;

  const response =
    await fetch(
      url,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Firestore list ${response.status}: ${text.slice(0, 240)}`,
    );
  }

  const data =
    await response.json();

  return (
    data.documents ??
    []
  ).map(
    decodeDocument,
  );
}

async function deleteDocument(
  env,
  path,
) {
  const response =
    await firestoreFetch(
      env,
      path,
      {
        method: 'DELETE',
      },
    );

  return (
    response.ok ||
    response.status === 404
  );
}

async function getUser(
  env,
  uid,
) {
  return getDocument(
    env,
    `users/${uid}`,
  );
}

async function getDevices(
  env,
  uid,
) {
  const documents =
    await listDocuments(
      env,
      `users/${uid}/devices`,
    );

  return documents.filter(
    item =>
      typeof item?.token === 'string' &&
      item.token,
  );
}

async function sendFcm(
  env,
  device,
  payload,
) {
  const accessToken =
    await getServiceAccessToken(
      env,
    );

  const data =
    Object.fromEntries(
      Object.entries(payload)
        .filter(([, value]) =>
          value !== undefined &&
          value !== null,
        )
        .map(([key, value]) => [
          key,
          String(value),
        ]),
    );

  const response =
    await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
        env.FIREBASE_PROJECT_ID,
      )}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          'content-type':
            'application/json; charset=utf-8',
        },
        body:
          JSON.stringify({
            message: {
              token:
                device.token,
              data,
              android: {
                priority:
                  'HIGH',
              },
            },
          }),
      },
    );

  if (response.ok) {
    return true;
  }

  const failure =
    await response
      .json()
      .catch(
        () => ({}),
      );

  const failureText =
    JSON.stringify(
      failure,
    );

  if (
    response.status === 404 ||
    failureText.includes(
      'UNREGISTERED',
    )
  ) {
    if (device.path) {
      await deleteDocument(
        env,
        device.path,
      ).catch(
        () => false,
      );
    }

    return false;
  }

  throw new Error(
    `FCM ${response.status}: ${failureText.slice(0, 300)}`,
  );
}

async function sendToRecipients(
  env,
  recipientUids,
  kind,
  payload,
) {
  let sent = 0;

  for (
    const group of
    chunk(
      recipientUids,
      8,
    )
  ) {
    const results =
      await Promise.all(
        group.map(
          async uid => {
            const user =
              await getUser(
                env,
                uid,
              );

            if (
              !user ||
              !preferencesAllow(
                user,
                kind,
              )
            ) {
              return 0;
            }

            const devices =
              await getDevices(
                env,
                uid,
              );

            let userSent = 0;

            for (
              const device of devices
            ) {
              const ok =
                await sendFcm(
                  env,
                  device,
                  payload,
                );

              if (ok) {
                userSent += 1;
              }
            }

            return userSent;
          },
        ),
      );

    sent +=
      results.reduce(
        (sum, value) =>
          sum + value,
        0,
      );
  }

  return sent;
}

async function applyRateLimit(
  env,
  uid,
) {
  const bucket =
    Math.floor(
      Date.now() /
      60_000,
    );

  const key =
    `rate:${encodeURIComponent(
      uid,
    )}:${bucket}`;

  const current =
    Number(
      await env.PUSH_EVENTS.get(
        key,
      ) ??
      0,
    );

  if (current >= 90) {
    const error =
      new Error(
        'Muitas solicitações.',
      );

    error.status = 429;
    throw error;
  }

  await env.PUSH_EVENTS.put(
    key,
    String(
      current + 1,
    ),
    {
      expirationTtl: 120,
    },
  );
}

async function readBody(
  request,
) {
  const contentLength =
    Number(
      request.headers.get(
        'content-length',
      ) ??
      0,
    );

  if (contentLength > 4096) {
    const error =
      new Error(
        'Payload grande demais.',
      );

    error.status = 413;
    throw error;
  }

  const body =
    await request.json();

  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    throw new Error(
      'JSON inválido.',
    );
  }

  return body;
}

function bearerToken(
  request,
) {
  const header =
    request.headers.get(
      'authorization',
    ) ?? '';

  const match =
    header.match(
      /^Bearer\s+(.+)$/i,
    );

  return match?.[1] ?? '';
}

async function handleDmMessage(
  env,
  uid,
  body,
) {
  const conversationId =
    assertShortId(
      body.conversationId,
      'conversationId',
    );

  const messageId =
    assertShortId(
      body.messageId,
      'messageId',
    );

  const conversation =
    await getDocument(
      env,
      `conversations/${conversationId}`,
    );

  if (!conversation) {
    return json(
      {error: 'Conversa não encontrada.'},
      404,
    );
  }

  const members =
    Array.isArray(
      conversation.members,
    )
      ? conversation.members
      : [];

  if (!members.includes(uid)) {
    return json(
      {error: 'Sem acesso à conversa.'},
      403,
    );
  }

  const message =
    await getDocument(
      env,
      `conversations/${conversationId}/messages/${messageId}`,
    );

  if (!message) {
    return json(
      {error: 'Mensagem não encontrada.'},
      404,
    );
  }

  if (message.senderId !== uid) {
    return json(
      {error: 'Remetente inválido.'},
      403,
    );
  }

  const sender =
    await getUser(
      env,
      uid,
    );

  const notification =
    buildNotification({
      kind: 'dm',
      sender,
      message,
    });

  const recipients =
    members.filter(
      memberUid =>
        memberUid !== uid,
    );

  const sent =
    await sendToRecipients(
      env,
      recipients,
      'dm',
      {
        ...notification,
        kind: 'dm',
        conversationId,
        messageId,
      },
    );

  return json({
    ok: true,
    sent,
  });
}

async function handleServerMessage(
  env,
  uid,
  body,
) {
  const serverId =
    assertShortId(
      body.serverId,
      'serverId',
    );

  const channelId =
    assertShortId(
      body.channelId,
      'channelId',
    );

  const messageId =
    assertShortId(
      body.messageId,
      'messageId',
    );

  const server =
    await getDocument(
      env,
      `servers/${serverId}`,
    );

  if (!server) {
    return json(
      {error: 'Servidor não encontrado.'},
      404,
    );
  }

  const members =
    Array.isArray(
      server.members,
    )
      ? server.members
      : [];

  if (!members.includes(uid)) {
    return json(
      {error: 'Sem acesso ao servidor.'},
      403,
    );
  }

  const message =
    await getDocument(
      env,
      `servers/${serverId}/channels/${channelId}/messages/${messageId}`,
    );

  if (!message) {
    return json(
      {error: 'Mensagem não encontrada.'},
      404,
    );
  }

  if (message.senderId !== uid) {
    return json(
      {error: 'Remetente inválido.'},
      403,
    );
  }

  const sender =
    await getUser(
      env,
      uid,
    );

  const notification =
    buildNotification({
      kind: 'server',
      sender,
      server,
      message,
    });

  const recipients =
    members.filter(
      memberUid =>
        memberUid !== uid,
    );

  const sent =
    await sendToRecipients(
      env,
      recipients,
      'server',
      {
        ...notification,
        kind: 'server',
        serverId,
        channelId,
        messageId,
      },
    );

  return json({
    ok: true,
    sent,
  });
}

async function handleDmCallJoin(
  env,
  uid,
  body,
) {
  const conversationId =
    assertShortId(
      body.conversationId,
      'conversationId',
    );

  const roomId =
    assertShortId(
      body.roomId,
      'roomId',
    );

  const sessionId =
    assertShortId(
      body.sessionId,
      'sessionId',
    );

  if (
    roomId !==
    `dm-${conversationId}`
  ) {
    return json(
      {error: 'Sala de DM inválida.'},
      400,
    );
  }

  const conversation =
    await getDocument(
      env,
      `conversations/${conversationId}`,
    );

  if (!conversation) {
    return json(
      {error: 'Conversa não encontrada.'},
      404,
    );
  }

  const members =
    Array.isArray(
      conversation.members,
    )
      ? conversation.members
      : [];

  if (!members.includes(uid)) {
    return json(
      {error: 'Sem acesso à conversa.'},
      403,
    );
  }

  const participant =
    await getDocument(
      env,
      `calls/${roomId}/participants/${uid}`,
    );

  if (
    !participant ||
    participant.sessionId !==
      sessionId
  ) {
    return json(
      {error: 'Sessão de call inválida.'},
      403,
    );
  }

  const dedupeKey =
    callDedupeKey({
      conversationId,
      uid,
      sessionId,
    });

  const duplicate =
    await env.PUSH_EVENTS.get(
      dedupeKey,
    );

  if (duplicate) {
    return json({
      ok: true,
      duplicate: true,
      sent: 0,
    });
  }

  await env.PUSH_EVENTS.put(
    dedupeKey,
    '1',
    {
      expirationTtl:
        6 * 60 * 60,
    },
  );

  const sender =
    await getUser(
      env,
      uid,
    );

  const notification =
    buildNotification({
      kind: 'dm-call',
      sender,
    });

  const recipients =
    members.filter(
      memberUid =>
        memberUid !== uid,
    );

  const sent =
    await sendToRecipients(
      env,
      recipients,
      'dm-call',
      {
        ...notification,
        kind: 'dm-call',
        conversationId,
        roomId,
        sessionId,
      },
    );

  return json({
    ok: true,
    duplicate: false,
    sent,
  });
}

export default {
  async fetch(
    request,
    env,
  ) {
    try {
      if (
        request.method === 'GET' &&
        new URL(
          request.url,
        ).pathname === '/health'
      ) {
        return json({
          ok: true,
          service:
            'eliseo-push',
        });
      }

      if (request.method !== 'POST') {
        return json(
          {error: 'Método não permitido.'},
          405,
        );
      }

      if (
        !env.FIREBASE_PROJECT_ID ||
        !env.PUSH_EVENTS
      ) {
        return json(
          {error: 'Worker não configurado.'},
          503,
        );
      }

      const verified =
        await verifyFirebaseIdToken(
          bearerToken(request),
          env.FIREBASE_PROJECT_ID,
        );

      await applyRateLimit(
        env,
        verified.uid,
      );

      const body =
        await readBody(
          request,
        );

      const path =
        new URL(
          request.url,
        ).pathname;

      if (path === '/v1/dm-message') {
        return handleDmMessage(
          env,
          verified.uid,
          body,
        );
      }

      if (path === '/v1/server-message') {
        return handleServerMessage(
          env,
          verified.uid,
          body,
        );
      }

      if (path === '/v1/dm-call-join') {
        return handleDmCallJoin(
          env,
          verified.uid,
          body,
        );
      }

      return json(
        {error: 'Endpoint não encontrado.'},
        404,
      );
    } catch (caught) {
      const status =
        Number(
          caught?.status ??
          0,
        ) ||
        (/token|Firebase|JWT|claim|autent/i.test(
          caught?.message ??
          '',
        )
          ? 401
          : 400);

      console.error(
        '[eliseo-push]',
        caught,
      );

      return json(
        {
          error:
            status >= 500
              ? 'Erro interno do push.'
              : caught?.message ||
                'Solicitação inválida.',
        },
        status,
      );
    }
  },
};
