import {useEffect, useRef, useState} from "react";
import type {User as FirebaseUser} from "firebase/auth";
import {
  Bell,
  Camera,
  CreditCard,
  GraduationCap,
  Link2,
  Music2,
  Palette,
  Pencil,
  Settings,
  ShieldCheck,
} from "lucide-react";

import type {EliseoUser} from "../firestore";
import {
  listenToExtendedProfile,
  updateUserBanner,
  type ExtendedUserProfile,
} from "./profileService";
import {uploadCommunityImage} from "../storage";
import {isRecentMusicActivity} from "./pure";

export type DesktopProfileDestination =
  | "customize"
  | "settings"
  | "notifications"
  | "integrations"
  | "finance"
  | "drive";

export function DesktopProfileView({
  user,
  profile,
  onEdit,
  onNavigate,
}: {
  user: FirebaseUser;
  profile: EliseoUser | null;
  onEdit: () => void;
  onNavigate: (destination: DesktopProfileDestination) => void;
}) {
  const [extended, setExtended] = useState<ExtendedUserProfile | null>(null);
  const [bannerBusy, setBannerBusy] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => listenToExtendedProfile(user.uid, setExtended), [user.uid]);

  const current = extended ?? profile;
  const name = current?.username || user.displayName || user.email?.split("@")[0] || "Usuário";
  const music = extended?.musicActivity;
  const showMusic = isRecentMusicActivity(music);

  async function changeBanner(file: File | null) {
    if (!file || bannerBusy) return;
    try {
      setBannerBusy(true);
      const uploaded = await uploadCommunityImage(user.uid, file);
      await updateUserBanner(user.uid, uploaded.url);
    } finally {
      setBannerBusy(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  return (
    <main className="desktop-parity-page desktop-profile-page">
      <header className="desktop-page-header desktop-page-header-spread">
        <div><h1>Perfil</h1><p>Sua identidade no Elíseo, agora alinhada ao aplicativo móvel.</p></div>
        <button className="desktop-primary-button" onClick={onEdit}><Pencil size={17}/> Editar perfil</button>
      </header>

      <section className="desktop-profile-hero">
        <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => void changeBanner(event.target.files?.[0] ?? null)}/>
        <button className="desktop-banner-edit" onClick={() => bannerInputRef.current?.click()} disabled={bannerBusy}><Camera size={16}/>{bannerBusy ? "Enviando…" : "Banner"}</button>
        {extended?.banner && <img className="desktop-profile-banner" src={extended.banner} alt=""/>}
        <div className="desktop-profile-shade"/>
        <div className="desktop-profile-avatar">
          {current?.avatar ? <img src={current.avatar} alt=""/> : name.charAt(0).toUpperCase()}
        </div>
        <div className="desktop-profile-copy">
          <h2>{name}</h2><span>@{name}</span>
          <p>{current?.bio || "Personalize sua bio no Elíseo."}</p>
          <div className="desktop-profile-badges">
            {extended?.course && <span><GraduationCap size={14}/>{extended.course}</span>}
            {extended?.institutionTag && <span className="verified"><ShieldCheck size={14}/>{extended.institutionTag}</span>}
          </div>
        </div>
      </section>

      <section className="desktop-profile-columns">
        <div className="desktop-section-card">
          <h2>Atividade</h2>
          {showMusic && music ? (
            <div className="desktop-music-card">
              {music.artworkUrl ? <img src={music.artworkUrl} alt=""/> : <div className="desktop-music-placeholder"><Music2/></div>}
              <div><small>{music.provider === "spotify" ? "Spotify" : music.provider === "youtube_music" ? "YouTube Music" : "Qobuz"}</small><strong>{music.title}</strong><span>{music.artist || "Artista desconhecido"}</span></div>
            </div>
          ) : <div className="desktop-empty-inline"><Music2 size={20}/><span>Nenhuma atividade musical recente.</span></div>}
          <button className="desktop-text-button" onClick={() => onNavigate("integrations")}><Link2 size={16}/> Gerenciar integrações</button>
        </div>

        <div className="desktop-section-card">
          <h2>Conta</h2>
          <div className="desktop-action-list">
            <button onClick={() => onNavigate("finance")}><CreditCard/><span><strong>Financeiro</strong><small>PIX e pagamentos P2P</small></span></button>
            <button onClick={() => onNavigate("customize")}><Palette/><span><strong>Aparência</strong><small>Tema do aplicativo</small></span></button>
            <button onClick={() => onNavigate("notifications")}><Bell/><span><strong>Notificações</strong><small>DMs e servidores</small></span></button>
            <button onClick={() => onNavigate("settings")}><Settings/><span><strong>Configurações</strong><small>Conta, privacidade e dados</small></span></button>
          </div>
        </div>
      </section>
    </main>
  );
}
