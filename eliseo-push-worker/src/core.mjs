export const MAX_BODY_LENGTH = 220;

export function normalizeText(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, MAX_BODY_LENGTH);
}

export function preferencesAllow(user, kind) {
  const notifications = user?.appPreferences?.notifications ?? {};
  if ((notifications.enabled ?? true) === false) return false;
  if (kind === 'dm' || kind === 'dm-call') return notifications.dms ?? true;
  if (kind === 'server') return notifications.servers ?? true;
  return false;
}

export function buildNotification({kind, sender, server, message}) {
  const senderName = normalizeText(sender?.username, 'Usuário');
  const senderAvatar = normalizeText(sender?.avatar, '');

  if (kind === 'dm') {
    return {
      title: senderName,
      body: normalizeText(message?.text, message?.mediaUrl ? 'Enviou uma imagem' : 'Nova mensagem'),
      largeIcon: senderAvatar,
    };
  }

  if (kind === 'dm-call') {
    return {
      title: senderName,
      body: 'entrou em uma chamada',
      largeIcon: senderAvatar,
    };
  }

  if (kind === 'server') {
    const serverName = normalizeText(server?.name, 'Servidor');
    const messageText = normalizeText(message?.text, message?.mediaUrl ? 'Enviou uma imagem' : 'Nova mensagem');
    return {
      title: serverName,
      body: normalizeText(`${senderName}: ${messageText}`),
      largeIcon: normalizeText(server?.photo, ''),
    };
  }

  throw new Error('Tipo de notificação inválido.');
}

export function callDedupeKey({conversationId, uid, sessionId}) {
  return ['dm-call', conversationId, uid, sessionId]
    .map(value => encodeURIComponent(String(value)))
    .join(':');
}

export function assertShortId(value, label, max = 256) {
  if (typeof value !== 'string' || !value || value.length > max || value.includes('/')) {
    throw new Error(`${label} inválido.`);
  }
  return value;
}

export function chunk(values, size) {
  const output = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}
