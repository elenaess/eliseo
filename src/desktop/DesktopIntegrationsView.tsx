import {useEffect, useState} from "react";
import {ArrowLeft, Check, Copy, Music2, Unlink} from "lucide-react";

import {
  beginSpotifyAuthorization,
  disconnectSpotify,
  spotifyRedirectUri,
  spotifyWebConnected,
  type MusicProvider,
  setMusicProvider,
} from "./musicService";
import {listenToExtendedProfile} from "./profileService";

export function DesktopIntegrationsView({uid, onBack}: {uid: string; onBack: () => void}) {
  const [provider, setProvider] = useState<MusicProvider>(null);
  const [connected, setConnected] = useState(spotifyWebConnected());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => listenToExtendedProfile(uid, profile => setProvider(profile?.musicProvider ?? null)), [uid]);

  async function select(next: MusicProvider) {
    if (busy) return;
    try {
      setBusy(true); setMessage("");
      if (next === "spotify") { await beginSpotifyAuthorization(); return; }
      if (next === "youtube_music" || next === "qobuz") {
        setMessage("No navegador, YouTube Music e Qobuz não expõem a MediaSession de outros apps. A atividade continua disponível no Android.");
        return;
      }
      if (connected) { await disconnectSpotify(uid); setConnected(false); }
      await setMusicProvider(uid, null);
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Não foi possível atualizar a integração."); }
    finally { setBusy(false); }
  }

  async function copyRedirect() {
    await navigator.clipboard.writeText(spotifyRedirectUri());
    setMessage("URI de redirecionamento copiada.");
  }

  return (
    <main className="desktop-parity-page">
      <header className="desktop-page-header"><button className="desktop-icon-button" onClick={onBack}><ArrowLeft size={20}/></button><div><h1>Integrações</h1><p>Atividade musical sincronizada entre desktop e mobile.</p></div></header>

      <section className="desktop-section-card">
        <h2>Fonte de atividade</h2>
        <div className="desktop-integration-list">
          <button className={provider === null ? "selected" : ""} onClick={() => void select(null)} disabled={busy}><div className="desktop-integration-icon"><Unlink/></div><div><strong>Nenhum</strong><span>Não publicar atividade musical.</span></div>{provider === null && <Check/>}</button>
          <button className={provider === "spotify" ? "selected" : ""} onClick={() => void select("spotify")} disabled={busy}><div className="desktop-integration-icon"><Music2/></div><div><strong>Spotify</strong><span>OAuth PKCE no navegador · {connected ? "conectado neste navegador" : "não conectado"}</span></div>{provider === "spotify" && <Check/>}</button>
          <button className={provider === "youtube_music" ? "selected muted" : "muted"} onClick={() => void select("youtube_music")} disabled={busy}><div className="desktop-integration-icon"><Music2/></div><div><strong>YouTube Music</strong><span>Leitura da sessão local disponível somente no Android.</span></div>{provider === "youtube_music" && <Check/>}</button>
          <button className={provider === "qobuz" ? "selected muted" : "muted"} onClick={() => void select("qobuz")} disabled={busy}><div className="desktop-integration-icon"><Music2/></div><div><strong>Qobuz</strong><span>Leitura da sessão local disponível somente no Android.</span></div>{provider === "qobuz" && <Check/>}</button>
        </div>
      </section>

      <section className="desktop-section-card">
        <h2>Spotify Web</h2>
        <p className="desktop-card-copy">Cadastre esta URI exatamente como Redirect URI no painel do Spotify. O Elíseo usa PKCE e não precisa armazenar client secret no navegador.</p>
        <div className="desktop-copy-field"><code>{spotifyRedirectUri()}</code><button onClick={() => void copyRedirect()}><Copy size={16}/> Copiar</button></div>
        {connected && <button className="desktop-danger-outline" onClick={() => void disconnectSpotify(uid).then(() => setConnected(false))}>Desconectar Spotify</button>}
      </section>
      {message && <p className="desktop-info-message">{message}</p>}
    </main>
  );
}
