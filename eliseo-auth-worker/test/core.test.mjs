import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_OTP_ATTEMPTS,
  OTP_TTL_MS,
  RESET_TOKEN_TTL_MS,
  normalizeEmail,
  passwordPolicyError,
  createOtpRecord,
  verifyOtpRecord,
  createResetRecord,
  verifyResetRecord,
} from '../src/core.mjs';

test('normaliza email sem alterar parte local além de case/trim', () => {
  assert.equal(normalizeEmail('  Elena.Test+1@Example.COM '), 'elena.test+1@example.com');
});

test('polÃ­tica de senha exige no mÃ­nimo 6 caracteres', () => {
  assert.match(passwordPolicyError('abc12'), /6 caracteres/);
  assert.equal(passwordPolicyError('abc123'), '');
  assert.equal(passwordPolicyError('uma-senha-boa-2026'), '');
});

test('OTP válido aceita uma vez dentro da janela', async () => {
  const now = 1_700_000_000_000;
  const record = await createOtpRecord({
    secret: 'pepper-test',
    subject: 'uid-1',
    purpose: 'verify_email',
    code: '123456',
    now,
  });

  assert.equal(record.expiresAt, now + OTP_TTL_MS);
  const ok = await verifyOtpRecord({
    secret: 'pepper-test',
    subject: 'uid-1',
    purpose: 'verify_email',
    code: '123456',
    record,
    now: now + 1000,
  });
  assert.equal(ok.ok, true);
});

test('OTP rejeita código errado e expiração', async () => {
  const now = 1_700_000_000_000;
  const record = await createOtpRecord({
    secret: 'pepper-test',
    subject: 'uid-2',
    purpose: 'password',
    code: '654321',
    now,
  });

  const wrong = await verifyOtpRecord({
    secret: 'pepper-test',
    subject: 'uid-2',
    purpose: 'password',
    code: '000000',
    record,
    now: now + 1000,
  });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, 'invalid');

  const expired = await verifyOtpRecord({
    secret: 'pepper-test',
    subject: 'uid-2',
    purpose: 'password',
    code: '654321',
    record,
    now: now + OTP_TTL_MS + 1,
  });
  assert.equal(expired.ok, false);
  assert.equal(expired.reason, 'expired');
});

test('OTP bloqueia após limite de tentativas', async () => {
  const now = 1_700_000_000_000;
  const record = await createOtpRecord({
    secret: 'pepper-test',
    subject: 'uid-3',
    purpose: 'password',
    code: '111111',
    now,
  });
  record.attempts = MAX_OTP_ATTEMPTS;

  const result = await verifyOtpRecord({
    secret: 'pepper-test',
    subject: 'uid-3',
    purpose: 'password',
    code: '111111',
    record,
    now,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'locked');
});

test('reset token expira e é validado por HMAC', async () => {
  const now = 1_700_000_000_000;
  const record = await createResetRecord({
    secret: 'pepper-test',
    subject: 'uid-4',
    token: 'token-super-secreto',
    now,
  });
  assert.equal(record.expiresAt, now + RESET_TOKEN_TTL_MS);

  assert.equal(
    await verifyResetRecord({
      secret: 'pepper-test',
      subject: 'uid-4',
      token: 'token-super-secreto',
      record,
      now: now + 10,
    }),
    true,
  );

  assert.equal(
    await verifyResetRecord({
      secret: 'pepper-test',
      subject: 'uid-4',
      token: 'errado',
      record,
      now: now + 10,
    }),
    false,
  );
});
