import {useEffect, useState} from "react";
import type {User as FirebaseUser} from "firebase/auth";
import {sendPasswordResetEmail} from "firebase/auth";
import {
  AtSign,
  Bell,
  Gauge,
  GraduationCap,
  KeyRound,
  Link2,
  Palette,
  Radio,
  School,
} from "lucide-react";

import {auth} from "../firebase";
import {findInstitutionForEmail} from "../../mobile/src/data/institutionalDomains";
import {
  listenToAppPreferences,
  setDataSaver,
  setShowOnlineStatus,
  type AppPreferences,
  DEFAULT_APP_PREFERENCES,
} from "./preferencesService";
import {
  listenToExtendedProfile,
  updateAcademicProfile,
  updateUserStatus,
  type ExtendedUserProfile,
  type PresenceStatus,
} from "./profileService";

export type DesktopSettingsDestination = "customize" | "notifications" | "integrations";

export function DesktopSettingsView({
  user,
  onNavigate,
}: {
  user: FirebaseUser;
  onNavigate: (destination: DesktopSettingsDestination) => void;
}) {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES);
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [course, setCourse] = useState("");
  const [institutionEmail, setInstitutionEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => listenToAppPreferences(user.uid, setPreferences), [user.uid]);
  useEffect(() => listenToExtendedProfile(user.uid, incoming => {
    setProfile(incoming);
    setCourse(incoming?.course ?? "");
    setInstitutionEmail(incoming?.institutionalEmail ?? "");
  }), [user.uid]);

  async function run(action: () => Promise<unknown>, success = "Configuração salva.") {
    if (saving) return;
    try { setSaving(true); setError(""); setMessage(""); await action(); setMessage(success); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  function saveInstitution() {
    const match = findInstitutionForEmail(institutionEmail);
    if (!match) { setError("Esse domínio ainda não está na lista institucional do Elíseo."); return; }
    const cleanEmail = institutionEmail.trim().toLowerCase();
    void run(() => updateAcademicProfile(user.uid, {
      institutionalEmail: cleanEmail,
      institutionDomain: match.domain,
      institutionName: match.institutionName,
      institutionTag: match.tag,
    }), `Tag ${match.tag} salva.`);
  }

  function changeStatus(status: PresenceStatus) {
    void run(() => updateUserStatus(user.uid, status), "Status atualizado.");
  }

  return (
    <main className="desktop-parity-page">
      <header className="desktop-page-header"><div><h1>Configurações</h1><p>Conta, identidade acadêmica, presença e preferências do aplicativo.</p></div></header>

      <div className="desktop-settings-grid">
        <section className="desktop-section-card">
          <h2>Conta</h2>
          <div className="desktop-info-row"><AtSign/><div><strong>E-mail</strong><span>{user.email || "Sem e-mail disponível"}</span></div></div>
          <button className="desktop-settings-action" onClick={() => void run(async () => {
            if (!user.email) throw new Error("Sua conta não possui e-mail.");
            await sendPasswordResetEmail(auth, user.email);
          }, "Link para alteração de senha enviado por e-mail.")} disabled={saving}><KeyRound/><div><strong>Alterar senha</strong><span>Enviar link seguro para o seu e-mail.</span></div></button>
        </section>

        <section className="desktop-section-card">
          <h2>Identidade acadêmica</h2>
          <label className="desktop-field"><span><GraduationCap size={16}/> Curso</span><div><input value={course} onChange={event => setCourse(event.target.value)} maxLength={80} placeholder="Ex.: Química"/><button onClick={() => void run(() => updateAcademicProfile(user.uid, {course}), "Curso salvo.")} disabled={saving}>Salvar</button></div></label>
          <label className="desktop-field"><span><School size={16}/> E-mail institucional</span><div><input value={institutionEmail} onChange={event => setInstitutionEmail(event.target.value)} placeholder="voce@universidade.br"/><button onClick={saveInstitution} disabled={saving}>Validar domínio</button></div></label>
          {profile?.institutionTag && <div className="desktop-verified-line"><School size={16}/><strong>{profile.institutionTag}</strong><span>{profile.institutionName}</span></div>}
        </section>

        <section className="desktop-section-card">
          <h2>Privacidade e presença</h2>
          <label className="desktop-switch-row"><Radio/><div><strong>Mostrar status online</strong><span>Publica sua presença enquanto o Elíseo está aberto.</span></div><input type="checkbox" checked={preferences.settings.showOnlineStatus} onChange={event => void run(() => setShowOnlineStatus(user.uid, event.target.checked))}/></label>
          <div className="desktop-status-choices"><button className={profile?.status === "online" ? "selected" : ""} onClick={() => changeStatus("online")}>Online</button><button className={profile?.status === "busy" ? "selected" : ""} onClick={() => changeStatus("busy")}>Ocupado</button><button className={profile?.status === "offline" ? "selected" : ""} onClick={() => changeStatus("offline")}>Offline</button></div>
          <label className="desktop-switch-row"><Gauge/><div><strong>Economia de dados</strong><span>Preferência compartilhada com o mobile para reduzir mídia automática.</span></div><input type="checkbox" checked={preferences.settings.dataSaver} onChange={event => void run(() => setDataSaver(user.uid, event.target.checked))}/></label>
        </section>

        <section className="desktop-section-card">
          <h2>Aplicativo</h2>
          <div className="desktop-action-list">
            <button onClick={() => onNavigate("customize")}><Palette/><span><strong>Aparência</strong><small>Fundo padrão ou branco</small></span></button>
            <button onClick={() => onNavigate("notifications")}><Bell/><span><strong>Notificações</strong><small>Central e preferências</small></span></button>
            <button onClick={() => onNavigate("integrations")}><Link2/><span><strong>Integrações</strong><small>Spotify e atividade musical</small></span></button>
          </div>
        </section>
      </div>
      {message && <p className="desktop-success">{message}</p>}{error && <p className="desktop-error">{error}</p>}
    </main>
  );
}
