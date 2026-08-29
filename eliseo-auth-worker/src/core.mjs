export const OTP_TTL_MS = 10 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 5 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;

const encoder = new TextEncoder();

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function passwordPolicyError(password) {
  const value = String(password ?? '');
  if (value.length < 6) return 'Use uma senha com pelo menos 6 caracteres.';
  if (value.length > 128) return 'A senha pode ter no máximo 128 caracteres.';
  return '';
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(secret)),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(String(value)),
  );
  return bytesToHex(new Uint8Array(signature));
}

export function constantTimeHexEqual(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < max; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export function randomOtp() {
  const range = 1_000_000;
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % range);
  const data = new Uint32Array(1);
  do {
    crypto.getRandomValues(data);
  } while (data[0] >= limit);
  return String(data[0] % range).padStart(6, '0');
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

export async function createOtpRecord({
  secret,
  subject,
  purpose,
  code,
  now = Date.now(),
}) {
  const salt = randomToken(16);
  const digest = await hmacHex(
    secret,
    `otp:${purpose}:${subject}:${salt}:${code}`,
  );
  return {
    version: 1,
    digest,
    salt,
    attempts: 0,
    createdAt: now,
    expiresAt: now + OTP_TTL_MS,
  };
}

export async function verifyOtpRecord({
  secret,
  subject,
  purpose,
  code,
  record,
  now = Date.now(),
}) {
  if (!record || typeof record !== 'object') {
    return {ok: false, reason: 'missing'};
  }
  if (now > Number(record.expiresAt || 0)) {
    return {ok: false, reason: 'expired'};
  }
  if (Number(record.attempts || 0) >= MAX_OTP_ATTEMPTS) {
    return {ok: false, reason: 'locked'};
  }
  const digest = await hmacHex(
    secret,
    `otp:${purpose}:${subject}:${record.salt}:${String(code ?? '')}`,
  );
  if (!constantTimeHexEqual(digest, record.digest)) {
    return {ok: false, reason: 'invalid'};
  }
  return {ok: true, reason: 'ok'};
}

export async function createResetRecord({
  secret,
  subject,
  token,
  now = Date.now(),
}) {
  const salt = randomToken(16);
  return {
    version: 1,
    salt,
    digest: await hmacHex(secret, `reset:${subject}:${salt}:${token}`),
    createdAt: now,
    expiresAt: now + RESET_TOKEN_TTL_MS,
  };
}

export async function verifyResetRecord({
  secret,
  subject,
  token,
  record,
  now = Date.now(),
}) {
  if (!record || now > Number(record.expiresAt || 0)) return false;
  const digest = await hmacHex(
    secret,
    `reset:${subject}:${record.salt}:${String(token ?? '')}`,
  );
  return constantTimeHexEqual(digest, record.digest);
}
