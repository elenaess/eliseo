import {
  SignJWT,
  decodeProtectedHeader,
  importPKCS8,
  importX509,
  jwtVerify,
} from 'jose';

import {
  MAX_OTP_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  createOtpRecord,
  createResetRecord,
  hmacHex,
  normalizeEmail,
  passwordPolicyError,
  randomOtp,
  randomToken,
  verifyOtpRecord,
  verifyResetRecord,
} from './core.mjs';

const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/identitytoolkit';

let certCache = {expiresAt: 0, values: null};
let accessTokenCache = {expiresAt: 0, value: ''};

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowed =
    origin === 'https://eliseo.live' ||
    origin === 'https://www.eliseo.live';
  return allowed
    ? {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'POST,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-firebase-appcheck',
        'access-control-max-age': '86400',
        vary: 'Origin',
      }
    : {};
}

function json(request, body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });
}

function normalizePrivateKey(value) {
  return String(value ?? '').replace(/\\n/g, '\n').trim();
}

function parseMaxAge(value) {
  const match = String(value ?? '').match(/max-age=(\d+)/i);
  return match ? Number(match[1]) : 3600;
}

async function getFirebaseCertificates() {
  const now = Date.now();
  if (certCache.values && certCache.expiresAt > now + 30_000) {
    return certCache.values;
  }
  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error('Não foi possível carregar as chaves públicas do Firebase.');
  }
  const values = await response.json();
  certCache = {
    values,
    expiresAt:
      now +
      parseMaxAge(response.headers.get('cache-control')) * 1000,
  };
  return values;
}

async function verifyFirebaseIdToken(token, projectId) {
  if (!token) throw new Error('Token ausente.');
  const header = decodeProtectedHeader(token);
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Token Firebase inválido.');
  }

  const certs = await getFirebaseCertificates();
  const certificate = certs?.[header.kid];
  if (!certificate) {
    throw new Error('Chave do token Firebase não reconhecida.');
  }
  const key = await importX509(certificate, 'RS256');
  const {payload} = await jwtVerify(token, key, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  const now = Math.floor(Date.now() / 1000);
  if (
    typeof payload.sub !== 'string' ||
    !payload.sub ||
    payload.sub.length > 128 ||
    typeof payload.iat !== 'number' ||
    payload.iat > now + 60 ||
    typeof payload.auth_time !== 'number' ||
    payload.auth_time > now + 60
  ) {
    throw new Error('Claims do token Firebase inválidas.');
  }

  return {
    uid: payload.sub,
    email: normalizeEmail(payload.email),
    emailVerified: payload.email_verified === true,
    payload,
  };
}

function bearer(request) {
  const value = request.headers.get('authorization') || '';
  return value.toLowerCase().startsWith('bearer ')
    ? value.slice(7).trim()
    : '';
}

async function getServiceAccessToken(env) {
  const now = Date.now();
  if (accessTokenCache.value && accessTokenCache.expiresAt > now + 60_000) {
    return accessTokenCache.value;
  }

  const clientEmail = String(env.FIREBASE_CLIENT_EMAIL ?? '').trim();
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
  if (!clientEmail || !privateKey) {
    throw new Error('Secrets Firebase do Worker não configurados.');
  }

  const key = await importPKCS8(privateKey, 'RS256');
  const assertion = await new SignJWT({scope: GOOGLE_SCOPE})
    .setProtectedHeader({alg: 'RS256', typ: 'JWT'})
    .setIssuer(clientEmail)
    .setAudience(OAUTH_TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) {
    throw new Error('Não foi possível autenticar o Worker no Firebase.');
  }

  accessTokenCache = {
    value: String(data.access_token),
    expiresAt: now + Number(data.expires_in || 3600) * 1000,
  };
  return accessTokenCache.value;
}

async function adminRequest(env, suffix, body) {
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID não configurado.');
  const token = await getServiceAccessToken(env);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:${suffix}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || `Firebase Admin ${response.status}`;
    throw new Error(detail);
  }
  return data;
}

async function lookupByEmail(env, email) {
  const result = await adminRequest(env, 'lookup', {email: [email]});
  return Array.isArray(result?.users) && result.users.length
    ? result.users[0]
    : null;
}

function hasPasswordProvider(account) {
  if (!account) return false;
  if (account.passwordHash) return true;
  return Array.isArray(account.providerUserInfo) &&
    account.providerUserInfo.some(
      provider => provider?.providerId === 'password',
    );
}

async function updateAccount(env, values) {
  return adminRequest(env, 'update', values);
}

async function kvGetJson(env, key) {
  const value = await env.AUTH_KV.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function kvPutJson(env, key, value, expirationTtl) {
  await env.AUTH_KV.put(key, JSON.stringify(value), {
    expirationTtl,
  });
}

async function subjectHash(env, value) {
  return hmacHex(env.OTP_PEPPER, `subject:${value}`);
}

async function enforceSendRate(env, subject, now = Date.now()) {
  const hash = await subjectHash(env, subject);
  const key = `rate:send:${hash}`;
  const record = (await kvGetJson(env, key)) || {
    windowStart: now,
    count: 0,
    lastSentAt: 0,
  };

  if (now - Number(record.lastSentAt || 0) < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      retryAfter: Math.ceil(
        (RESEND_COOLDOWN_MS - (now - Number(record.lastSentAt || 0))) /
          1000,
      ),
    };
  }

  if (now - Number(record.windowStart || 0) > 60 * 60 * 1000) {
    record.windowStart = now;
    record.count = 0;
  }
  if (Number(record.count || 0) >= 8) {
    return {ok: false, retryAfter: 3600};
  }

  record.count = Number(record.count || 0) + 1;
  record.lastSentAt = now;
  await kvPutJson(env, key, record, 3700);
  return {ok: true, retryAfter: 0};
}

function otpKey(purpose, uid) {
  return `otp:${purpose}:${uid}`;
}

function resetKey(uid) {
  return `reset:${uid}`;
}

async function sendResendEmail(env, {to, code, purpose}) {
  const isVerification = purpose === 'verify_email';
  const subject = isVerification
    ? 'Confirme seu e-mail no Elíseo'
    : 'Código para alterar sua senha do Elíseo';
  const action = isVerification
    ? 'confirmar seu e-mail'
    : 'alterar sua senha';

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#07101B;color:#EAF0FA;font-family:Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;padding:36px 22px">
      <div style="background:#0D1828;border:1px solid #1E2B40;border-radius:18px;padding:30px">
        <div style="margin-bottom:16px">
          <img src="https://eliseo.live/eliseo.png" width="52" height="52" alt="Elíseo" style="display:block;width:52px;height:52px;object-fit:contain;border:0;margin-bottom:10px" />
          <div style="font-size:26px;font-weight:700">Elíseo</div>
        </div>
        <div style="color:#AAB7C8;font-size:14px;line-height:1.6">
          Use o código abaixo para ${action}. Ele expira em 10 minutos.
        </div>
        <div style="font-size:38px;letter-spacing:8px;font-weight:800;margin:28px 0;color:#71A5FF">${code}</div>
        <div style="color:#738196;font-size:12px;line-height:1.55">
          Se você não iniciou esta ação, ignore esta mensagem. Nunca compartilhe este código.
        </div>
      </div>
    </div>
  </body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from:
        String(env.EMAIL_FROM || '').trim() ||
        'Elíseo <verification@eliseo.live>',
      to: [to],
      subject,
      html,
      text: `Elíseo\n\nSeu código para ${action}: ${code}\n\nEle expira em 10 minutos. Se você não iniciou esta ação, ignore esta mensagem.`,
    }),
  });

  const rawBody = await response.text();

  let data = {};

  try {
    data = rawBody
      ? JSON.parse(rawBody)
      : {};
  } catch {
    data = {
      raw: rawBody.slice(0, 500),
    };
  }

  if (!response.ok) {
    console.error(
      'resend-send-failed',
      {
        status: response.status,
        statusText: response.statusText,
        body: data,
      },
    );

    throw new Error(
      `Resend HTTP ${response.status}: ${
        data?.message ||
        data?.error ||
        'email rejected'
      }`,
    );
  }

  return data;
}

async function sendOtp(env, {uid, email, purpose}) {
  // Password reset ja possui rate limit publico em handlePasswordRequest().
  // Evita aplicar dois cooldowns consecutivos ao mesmo envio.
  if (purpose !== 'password') {
    const rate = await enforceSendRate(env, `${purpose}:${uid || email}`);
    if (!rate.ok) return rate;
  }

  const code = randomOtp();
  const subject = uid || (await subjectHash(env, email));
  const record = await createOtpRecord({
    secret: env.OTP_PEPPER,
    subject,
    purpose,
    code,
  });
  await kvPutJson(env, otpKey(purpose, subject), record, 11 * 60);
  await sendResendEmail(env, {to: email, code, purpose});
  return {ok: true, retryAfter: 0};
}

async function readJson(request) {
  const body = await request.json().catch(() => ({}));
  return body && typeof body === 'object' ? body : {};
}

async function requireFirebaseUser(request, env) {
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID não configurado.');
  return verifyFirebaseIdToken(bearer(request), projectId);
}

async function handleVerificationSend(request, env) {
  const user = await requireFirebaseUser(request, env);
  if (!user.email) return json(request, {error: 'Conta sem e-mail.'}, 400);
  if (user.emailVerified) return json(request, {ok: true, alreadyVerified: true});

  const result = await sendOtp(env, {
    uid: user.uid,
    email: user.email,
    purpose: 'verify_email',
  });
  if (!result.ok) {
    return json(
      request,
      {error: 'Aguarde antes de pedir outro código.', retryAfter: result.retryAfter},
      429,
      {'retry-after': String(result.retryAfter)},
    );
  }
  return json(request, {ok: true, retryAfter: 60});
}

async function handleVerificationConfirm(request, env) {
  const user = await requireFirebaseUser(request, env);
  const body = await readJson(request);
  const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);
  if (code.length !== 6) return json(request, {error: 'Código inválido.'}, 400);

  const key = otpKey('verify_email', user.uid);
  const record = await kvGetJson(env, key);
  const result = await verifyOtpRecord({
    secret: env.OTP_PEPPER,
    subject: user.uid,
    purpose: 'verify_email',
    code,
    record,
  });

  if (!result.ok) {
    if (record && result.reason === 'invalid') {
      record.attempts = Number(record.attempts || 0) + 1;
      await kvPutJson(env, key, record, 11 * 60);
    }
    const status = result.reason === 'locked' ? 429 : 400;
    return json(
      request,
      {
        error:
          result.reason === 'expired'
            ? 'O código expirou. Peça um novo.'
            : result.reason === 'locked'
              ? 'Muitas tentativas. Peça um novo código.'
              : 'Código incorreto.',
      },
      status,
    );
  }

  await updateAccount(env, {
    localId: user.uid,
    emailVerified: true,
  });
  await env.AUTH_KV.delete(key);
  return json(request, {ok: true});
}

async function resolvePasswordUser(request, env, body) {
  const authHeader = bearer(request);
  if (authHeader) {
    const user = await requireFirebaseUser(request, env);
    if (!user.email) return null;
    const account = await lookupByEmail(env, user.email).catch(() => null);
    return account?.localId && hasPasswordProvider(account)
      ? {uid: String(account.localId), email: user.email}
      : null;
  }

  const email = normalizeEmail(body.email);
  if (!email || email.length > 254) return null;
  const account = await lookupByEmail(env, email).catch(caught => {
    console.error('password-flow-lookup-error', caught);
    return null;
  });
  return account?.localId && hasPasswordProvider(account)
    ? {uid: String(account.localId), email}
    : null;
}

async function handlePasswordRequest(request, env) {
  const body = await readJson(request);
  const requestedEmail = normalizeEmail(body.email);

  // Rate limiting também acontece para e-mails inexistentes, sem revelar cadastro.
  const publicSubject = requestedEmail || request.headers.get('cf-connecting-ip') || 'unknown';
  const publicRate = await enforceSendRate(env, `password-public:v2:${publicSubject}`);

  console.log('password-flow-public-rate', {
    ok: publicRate.ok,
    retryAfter: publicRate.retryAfter,
  });

  if (!publicRate.ok) {
    return json(request, {ok: true, retryAfter: publicRate.retryAfter});
  }

  const account = await resolvePasswordUser(request, env, body);

  console.log('password-flow-account', {
    found: Boolean(account),
  });

  if (account) {
    const sendResult = await sendOtp(env, {
      uid: account.uid,
      email: account.email,
      purpose: 'password',
    });

    console.log('password-flow-send-result', {
      ok: sendResult?.ok === true,
      retryAfter: Number(sendResult?.retryAfter || 0),
    });
  }

  return json(request, {ok: true, retryAfter: 60});
}

async function handlePasswordVerify(request, env) {
  const body = await readJson(request);
  const account = await resolvePasswordUser(request, env, body);
  const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);

  if (!account || code.length !== 6) {
    return json(request, {error: 'Código inválido ou expirado.'}, 400);
  }

  const key = otpKey('password', account.uid);
  const record = await kvGetJson(env, key);
  const result = await verifyOtpRecord({
    secret: env.OTP_PEPPER,
    subject: account.uid,
    purpose: 'password',
    code,
    record,
  });

  if (!result.ok) {
    if (record && result.reason === 'invalid') {
      record.attempts = Number(record.attempts || 0) + 1;
      await kvPutJson(env, key, record, 11 * 60);
    }
    return json(
      request,
      {
        error:
          result.reason === 'locked'
            ? 'Muitas tentativas. Peça um novo código.'
            : 'Código inválido ou expirado.',
      },
      result.reason === 'locked' ? 429 : 400,
    );
  }

  await env.AUTH_KV.delete(key);
  const resetToken = randomToken(32);
  const resetRecord = await createResetRecord({
    secret: env.OTP_PEPPER,
    subject: account.uid,
    token: resetToken,
  });
  await kvPutJson(env, resetKey(account.uid), resetRecord, 6 * 60);

  return json(request, {
    ok: true,
    resetToken,
    email: account.email,
  });
}

async function handlePasswordReset(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const resetToken = String(body.resetToken || '');
  const newPassword = String(body.newPassword || '');
  const policyError = passwordPolicyError(newPassword);
  if (policyError) return json(request, {error: policyError}, 400);

  const account = await lookupByEmail(env, email).catch(caught => {
    console.error('password-flow-lookup-error', caught);
    return null;
  });
  if (!account?.localId) {
    return json(request, {error: 'Autorização expirada. Comece novamente.'}, 400);
  }

  const uid = String(account.localId);
  const key = resetKey(uid);
  const record = await kvGetJson(env, key);
  const valid = await verifyResetRecord({
    secret: env.OTP_PEPPER,
    subject: uid,
    token: resetToken,
    record,
  });
  if (!valid) {
    return json(request, {error: 'Autorização expirada. Comece novamente.'}, 400);
  }

  await updateAccount(env, {
    localId: uid,
    password: newPassword,
    validSince: String(Math.floor(Date.now() / 1000)),
  });
  await env.AUTH_KV.delete(key);
  return json(request, {ok: true});
}

function assertEnv(env) {
  for (const key of [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'RESEND_API_KEY',
    'OTP_PEPPER',
  ]) {
    if (!String(env[key] || '').trim()) {
      throw new Error(`${key} não configurado.`);
    }
  }
  if (!env.AUTH_KV) throw new Error('AUTH_KV não configurado.');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    try {
      assertEnv(env);
      const url = new URL(request.url);
      if (request.method !== 'POST') {
        return json(request, {error: 'Método não permitido.'}, 405);
      }

      if (url.pathname === '/v1/verification/send') {
        return await handleVerificationSend(request, env);
      }
      if (url.pathname === '/v1/verification/confirm') {
        return await handleVerificationConfirm(request, env);
      }
      if (url.pathname === '/v1/password/request') {
        return await handlePasswordRequest(request, env);
      }
      if (url.pathname === '/v1/password/verify') {
        return await handlePasswordVerify(request, env);
      }
      if (url.pathname === '/v1/password/reset') {
        return await handlePasswordReset(request, env);
      }

      return json(request, {error: 'Rota não encontrada.'}, 404);
    } catch (caught) {
      console.error('auth-worker', caught);
      const message =
        caught instanceof Error ? caught.message : 'Falha interna.';
      const authFailure =
        message.includes('Token') ||
        message.includes('Firebase inválido') ||
        message.includes('Claims');
      return json(
        request,
        {error: authFailure ? 'Sessão inválida. Entre novamente.' : 'Falha interna.'},
        authFailure ? 401 : 500,
      );
    }
  },
};
