import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/index.mjs';

test(
  'captura rejeicoes assincronas das rotas e responde 500',
  async () => {
    const request = new Request(
      'https://eliseo-auth.test/v1/password/request',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'teste@eliseo.live',
        }),
      },
    );

    const env = {
      FIREBASE_PROJECT_ID: 'eliseeo',
      FIREBASE_CLIENT_EMAIL: 'teste@example.com',
      FIREBASE_PRIVATE_KEY: 'fake',
      RESEND_API_KEY: 'fake',
      OTP_PEPPER: 'fake',
      AUTH_KV: {
        async get() {
          throw new Error('erro-assincrono-de-teste');
        },
      },
    };

    const response =
      await worker.fetch(
        request,
        env,
      );

    assert.equal(
      response.status,
      500,
    );

    assert.deepEqual(
      await response.json(),
      {
        error: 'Falha interna.',
      },
    );
  },
);