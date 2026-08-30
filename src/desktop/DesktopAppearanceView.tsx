import {useEffect, useState} from "react";
import {ArrowLeft, Moon, Sun} from "lucide-react";

import {
  listenToAppPreferences,
  setAppBackground,
  type AppBackground,
} from "./preferencesService";

export function DesktopAppearanceView({
  uid,
  onBack,
}: {
  uid: string;
  onBack: () => void;
}) {
  const [background, setBackground] = useState<AppBackground>("default");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => listenToAppPreferences(uid, prefs => setBackground(prefs.background)), [uid]);

  async function choose(next: AppBackground) {
    if (saving || next === background) return;
    try {
      setSaving(true);
      setError("");
      await setAppBackground(uid, next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível alterar a aparência.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="desktop-parity-page">
      <header className="desktop-page-header">
        <button className="desktop-icon-button" onClick={onBack} title="Voltar"><ArrowLeft size={20}/></button>
        <div><h1>Aparência</h1><p>Use o mesmo tema em todas as áreas do Elíseo.</p></div>
      </header>

      <section className="desktop-theme-preview" data-preview-theme={background}>
        <div className="desktop-theme-preview-head">
          {background === "white" ? <Sun size={24}/> : <Moon size={24}/>}<strong>{background === "white" ? "Fundo branco" : "Fundo padrão"}</strong>
        </div>
        <div className="desktop-theme-preview-body"><i/><i/><i/></div>
      </section>

      <section className="desktop-section-card">
        <h2>Fundo</h2>
        <div className="desktop-choice-grid two">
          <button className={background === "default" ? "selected" : ""} onClick={() => void choose("default")} disabled={saving}>
            <Moon size={21}/><strong>Padrão escuro</strong><span>Visual original do Elíseo.</span>
          </button>
          <button className={background === "white" ? "selected" : ""} onClick={() => void choose("white")} disabled={saving}>
            <Sun size={21}/><strong>Branco</strong><span>Paleta clara sincronizada com a conta.</span>
          </button>
        </div>
        {error && <p className="desktop-error">{error}</p>}
      </section>
    </main>
  );
}
