import {useEffect, useMemo, useState} from "react";
import {Bell, BellOff, CheckCheck, Hash, MessageCircle} from "lucide-react";

import {
  listenToNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
  type EliseoNotificationItem,
} from "./notificationsService";
import {
  DEFAULT_APP_PREFERENCES,
  listenToAppPreferences,
  setDmNotificationsEnabled,
  setNotificationsEnabled,
  setServerNotificationsEnabled,
  type AppPreferences,
} from "./preferencesService";
import {timestampValue} from "./pure";

function formatTime(value: any) {
  const millis = timestampValue(value);
  if (!millis) return "agora";
  const date = new Date(millis);
  return date.toLocaleString("pt-BR", {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"});
}

export function DesktopNotificationsView({
  uid,
  onOpenDm,
  onOpenServer,
}: {
  uid: string;
  onOpenDm: (conversationId: string) => void;
  onOpenServer: (item: EliseoNotificationItem) => void;
}) {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES);
  const [items, setItems] = useState<EliseoNotificationItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => listenToAppPreferences(uid, setPreferences), [uid]);
  useEffect(() => listenToNotificationFeed(uid, setItems), [uid]);

  const visible = useMemo(() => items.filter(item => item.kind === "dm" ? preferences.notifications.dms : preferences.notifications.servers), [items, preferences]);
  const unread = visible.reduce((sum, item) => sum + Math.max(1, item.unreadCount), 0);

  async function open(item: EliseoNotificationItem) {
    try { await markNotificationRead(uid, item); } catch {}
    if (item.kind === "dm") onOpenDm(item.conversationId); else onOpenServer(item);
  }

  async function requestBrowserPermission() {
    if (!("Notification" in window)) { setError("Este navegador não oferece notificações do sistema."); return; }
    const result = await Notification.requestPermission();
    if (result !== "granted") setError("O navegador não concedeu permissão para notificações do sistema.");
  }

  return (
    <main className="desktop-parity-page">
      <header className="desktop-page-header desktop-page-header-spread"><div><h1>Notificações {unread > 0 && <span className="desktop-count-badge">{unread > 99 ? "99+" : unread}</span>}</h1><p>DMs e mensagens novas dos seus servidores.</p></div>{visible.length > 0 && <button className="desktop-secondary-button" onClick={() => void markAllNotificationsRead(uid, visible)}><CheckCheck size={17}/> Marcar tudo como lido</button>}</header>

      <section className="desktop-section-card desktop-notification-controls">
        <label className="desktop-switch-row"><Bell/><div><strong>Notificações</strong><span>Ativa a central compartilhada com o mobile.</span></div><input type="checkbox" checked={preferences.notifications.enabled} onChange={event => void setNotificationsEnabled(uid, event.target.checked)}/></label>
        <label className="desktop-switch-row"><MessageCircle/><div><strong>Mensagens diretas</strong><span>Exibir DMs não lidas.</span></div><input type="checkbox" disabled={!preferences.notifications.enabled} checked={preferences.notifications.dms} onChange={event => void setDmNotificationsEnabled(uid, event.target.checked)}/></label>
        <label className="desktop-switch-row"><Hash/><div><strong>Servidores</strong><span>Exibir novidades dos canais.</span></div><input type="checkbox" disabled={!preferences.notifications.enabled} checked={preferences.notifications.servers} onChange={event => void setServerNotificationsEnabled(uid, event.target.checked)}/></label>
        <button className="desktop-text-button" onClick={() => void requestBrowserPermission()}><Bell size={16}/> Permitir avisos do navegador</button>
      </section>

      <section className="desktop-section-card">
        <h2>Recentes</h2>
        {!preferences.notifications.enabled ? <div className="desktop-empty-state"><BellOff/><strong>Notificações desativadas</strong><span>Ative a opção acima para voltar a acompanhar novidades.</span></div> : visible.length === 0 ? <div className="desktop-empty-state"><Bell/><strong>Tudo em dia</strong><span>Nenhuma mensagem nova agora.</span></div> : <div className="desktop-notification-list">{visible.map(item => <button key={item.id} onClick={() => void open(item)}><div className="desktop-notification-icon">{item.kind === "dm" ? <MessageCircle/> : <Hash/>}</div><div><div className="desktop-notification-title"><strong>{item.title}</strong><time>{formatTime(item.createdAt)}</time></div>{item.kind === "server" && <small>{item.chatName}</small>}<p>{item.body}</p></div>{item.unreadCount > 1 && <span className="desktop-count-badge">{item.unreadCount}</span>}</button>)}</div>}
      </section>
      {error && <p className="desktop-error">{error}</p>}
    </main>
  );
}
