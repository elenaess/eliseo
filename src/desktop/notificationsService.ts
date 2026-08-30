import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import {
  listenToServerChannels,
  listenToUserConversations,
  listenToUserServers,
  markConversationRead,
} from "../firestore";
import { timestampValue } from "./pure";

export type EliseoNotificationItem = {
  id: string;
  kind: "dm" | "server";
  title: string;
  body: string;
  createdAt: any;
  unreadCount: number;
  conversationId: string;
  chatName: string;
  otherUid?: string;
  serverId?: string;
  channelId?: string;
};

type LatestChannelMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
};

function serverReadKey(serverId: string, channelId: string) {
  return `${serverId}__${channelId}`.replace(/\./g, "_");
}

export async function markServerChannelRead(uid: string, serverId: string, channelId: string) {
  if (!uid || !serverId || !channelId) return;
  const key = serverReadKey(serverId, channelId);
  await updateDoc(doc(db, "users", uid), {
    [`serverChannelReads.${key}`]: serverTimestamp(),
  });
}

export function listenToNotificationFeed(
  uid: string,
  callback: (items: EliseoNotificationItem[]) => void,
) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  let disposed = false;
  let dmItems: EliseoNotificationItem[] = [];
  let readMap: Record<string, any> = {};
  const latestMessages = new Map<string, LatestChannelMessage | null>();
  const channelInfo = new Map<
    string,
    {serverId: string; serverName: string; channelId: string; channelName: string}
  >();
  const channelListStops = new Map<string, () => void>();
  const messageStops = new Map<string, () => void>();

  const channelKey = (serverId: string, channelId: string) => `${serverId}::${channelId}`;

  function emit() {
    if (disposed) return;
    const serverItems: EliseoNotificationItem[] = [];
    for (const [key, message] of latestMessages) {
      if (!message || message.senderId === uid) continue;
      const info = channelInfo.get(key);
      if (!info) continue;
      const readAt = timestampValue(readMap?.[serverReadKey(info.serverId, info.channelId)]);
      const messageAt = timestampValue(message.createdAt);
      if (!messageAt || messageAt <= readAt) continue;
      serverItems.push({
        id: `server:${info.serverId}:${info.channelId}:${message.id}`,
        kind: "server",
        title: info.serverName,
        body: message.text || "Enviou uma imagem.",
        createdAt: message.createdAt,
        unreadCount: 1,
        conversationId: `channel:${info.serverId}:${info.channelId}`,
        chatName: `# ${info.channelName}`,
        serverId: info.serverId,
        channelId: info.channelId,
      });
    }
    callback(
      [...dmItems, ...serverItems].sort(
        (first, second) => timestampValue(second.createdAt) - timestampValue(first.createdAt),
      ),
    );
  }

  const stopPreferences = onSnapshot(doc(db, "users", uid), (snapshot) => {
    readMap = snapshot.data()?.serverChannelReads ?? {};
    emit();
  });

  const stopDms = listenToUserConversations(uid, async (conversations) => {
    const unread = conversations.filter((conversation) => Number(conversation.unread ?? 0) > 0);
    dmItems = unread.map((conversation) => ({
      id: `dm:${conversation.id}`,
      kind: "dm" as const,
      title: `@${conversation.otherUser?.username || "Mensagem direta"}`,
      body: conversation.lastMessage || "Nova mensagem",
      createdAt: conversation.lastMessageAt,
      unreadCount: Number(conversation.unread ?? 0),
      conversationId: conversation.id,
      chatName: conversation.otherUser?.username || "Mensagem direta",
      otherUid: conversation.otherUser?.uid || undefined,
    }));
    emit();
  });

  function stopMessagesForServer(serverId: string) {
    for (const [key, stop] of messageStops) {
      if (!key.startsWith(`${serverId}::`)) continue;
      stop();
      messageStops.delete(key);
      latestMessages.delete(key);
      channelInfo.delete(key);
    }
  }

  const stopServers = listenToUserServers(uid, (servers) => {
    const activeIds = new Set(servers.map((server) => server.id));
    for (const [serverId, stop] of channelListStops) {
      if (activeIds.has(serverId)) continue;
      stop();
      channelListStops.delete(serverId);
      stopMessagesForServer(serverId);
    }

    for (const server of servers) {
      if (channelListStops.has(server.id)) continue;
      const stopChannels = listenToServerChannels(server.id, (channels) => {
        stopMessagesForServer(server.id);
        for (const channel of channels) {
          const key = channelKey(server.id, channel.id);
          channelInfo.set(key, {
            serverId: server.id,
            serverName: server.name || "Servidor",
            channelId: channel.id,
            channelName: channel.name || "canal",
          });
          const latestQuery = query(
            collection(db, "servers", server.id, "channels", channel.id, "messages"),
            orderBy("createdAt", "desc"),
            limit(1),
          );
          const stopMessage = onSnapshot(latestQuery, (snapshot) => {
            const messageDoc = snapshot.docs[0];
            if (!messageDoc) {
              latestMessages.set(key, null);
              emit();
              return;
            }
            const data = messageDoc.data();
            latestMessages.set(key, {
              id: messageDoc.id,
              senderId: data.senderId ?? "",
              text: data.text ?? "",
              createdAt: data.createdAt ?? null,
            });
            emit();
          });
          messageStops.set(key, stopMessage);
        }
        emit();
      });
      channelListStops.set(server.id, stopChannels);
    }
    emit();
  });

  return () => {
    disposed = true;
    stopPreferences();
    stopDms();
    stopServers();
    for (const stop of channelListStops.values()) stop();
    for (const stop of messageStops.values()) stop();
    channelListStops.clear();
    messageStops.clear();
  };
}

export async function markNotificationRead(uid: string, item: EliseoNotificationItem) {
  if (item.kind === "dm") {
    await markConversationRead(item.conversationId, uid);
    return;
  }
  if (item.serverId && item.channelId) {
    await markServerChannelRead(uid, item.serverId, item.channelId);
  }
}

export async function markAllNotificationsRead(uid: string, items: EliseoNotificationItem[]) {
  await Promise.all(items.map((item) => markNotificationRead(uid, item)));
}
