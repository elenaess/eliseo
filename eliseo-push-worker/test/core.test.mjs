import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertShortId,
  buildNotification,
  callDedupeKey,
  preferencesAllow,
} from '../src/core.mjs';

test('DM usa nome, avatar e mensagem do remetente', () => {
  const notification =
    buildNotification({
      kind: 'dm',
      sender: {
        username: 'Luna',
        avatar: 'https://cdn/avatar.png',
      },
      message: {
        text: 'oiii sumida',
      },
    });

  assert.deepEqual(
    notification,
    {
      title: 'Luna',
      body: 'oiii sumida',
      largeIcon:
        'https://cdn/avatar.png',
    },
  );
});

test('servidor usa nome e foto do servidor', () => {
  const notification =
    buildNotification({
      kind: 'server',
      sender: {
        username: 'Luna',
      },
      server: {
        name: 'Elíseo Dev',
        photo: 'https://cdn/server.png',
      },
      message: {
        text: 'alguém testa a call?',
      },
    });

  assert.equal(
    notification.title,
    'Elíseo Dev',
  );
  assert.equal(
    notification.body,
    'Luna: alguém testa a call?',
  );
  assert.equal(
    notification.largeIcon,
    'https://cdn/server.png',
  );
});

test('call em DM gera chave única por sessão', () => {
  const one =
    callDedupeKey({
      conversationId: 'abc',
      uid: 'u1',
      sessionId: 's1',
    });

  const same =
    callDedupeKey({
      conversationId: 'abc',
      uid: 'u1',
      sessionId: 's1',
    });

  const other =
    callDedupeKey({
      conversationId: 'abc',
      uid: 'u1',
      sessionId: 's2',
    });

  assert.equal(one, same);
  assert.notEqual(one, other);
});

test('preferências desligadas bloqueiam envio', () => {
  assert.equal(
    preferencesAllow(
      {
        appPreferences: {
          notifications: {
            enabled: true,
            dms: false,
          },
        },
      },
      'dm',
    ),
    false,
  );

  assert.equal(
    preferencesAllow(
      {
        appPreferences: {
          notifications: {
            enabled: true,
            servers: false,
          },
        },
      },
      'server',
    ),
    false,
  );
});

test('IDs com barra são rejeitados', () => {
  assert.throws(
    () =>
      assertShortId(
        'bad/id',
        'messageId',
      ),
    /inválido/,
  );
});
