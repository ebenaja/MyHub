import { useEffect, useState } from "react";
import {
  Check,
  Globe2,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  Sun,
  UserRound,
  Wallet,
} from "lucide-react";
import "./PersonalModules.css";
import { type AppSettings } from "./services/settingsService";
import { translate } from "./i18n";

type SettingsPageProps = {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
};

export default function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const tx = (value: string) => translate(form.language, value);

  useEffect(() => setForm(settings), [settings]);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setForm((previous) => {
      if (key === "language") {
        const nextLanguage = value as AppSettings["language"];
        return { ...previous, language: nextLanguage, date_format: nextLanguage === "id" ? "id-ID" : "en-US" };
      }
      return { ...previous, [key]: value };
    });
    setMessage("");
  }

  async function submit(next: AppSettings) {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await onSave(next);
      setMessage(translate(next.language, "Pengaturan berhasil disimpan ke database lokal."));
    } catch (saveError) {
      console.error("Gagal menyimpan pengaturan:", saveError);
      setError(translate(next.language, "Pengaturan gagal disimpan. Pastikan tabel app_settings tersedia."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="personal-page settings-page page-enter">
      <section className="personal-page-heading settings-page-heading">
        <div>
          <span className="welcome-eyebrow">{tx("Preferensi")}</span>
          <h1>{tx("Pengaturan")}<span>.</span></h1>
          <p>{tx("Atur MyHub sesuai cara kerjamu.")}</p>
        </div>
        <div className="settings-language-pill"><Globe2 size={16} />{form.language === "id" ? "Bahasa Indonesia" : "English"}</div>
      </section>

      <div className="settings-layout">
        <section className="panel settings-main-panel">
          <div className="settings-section-heading">
            <div className="settings-heading-icon"><Globe2 size={19} /></div>
            <div><h2>{tx("Bahasa Tampilan")}</h2><p>{tx("Pilih satu bahasa untuk seluruh antarmuka MyHub. Semua menu, tombol, formulir, dan pesan akan mengikuti pilihan ini.")}</p></div>
          </div>
          <div className="settings-language-grid">
            <button type="button" className={`settings-language-choice ${form.language === "id" ? "selected" : ""}`} onClick={() => update("language", "id")}>
              <span className="language-flag">ID</span><span><strong>{form.language === "id" ? "Bahasa Indonesia" : "Indonesian"}</strong><small>{tx("Seluruh tampilan menggunakan Bahasa Indonesia")}</small></span>{form.language === "id" && <Check size={18} />}
            </button>
            <button type="button" className={`settings-language-choice ${form.language === "en" ? "selected" : ""}`} onClick={() => update("language", "en")}>
              <span className="language-flag language-flag-en">EN</span><span><strong>English</strong><small>{tx("Gunakan Bahasa Indonesia di seluruh antarmuka")}</small></span>{form.language === "en" && <Check size={18} />}
            </button>
          </div>
          <p className="settings-inline-hint">{tx("Bahasa akan diterapkan setelah kamu menekan Simpan Pengaturan.")}</p>

          <div className="settings-divider" />
          <div className="settings-section-heading"><div className="settings-heading-icon"><UserRound size={19} /></div><div><h2>{tx("Profil")}</h2><p>{tx("Nama ini akan digunakan di sidebar dan dashboard.")}</p></div></div>
          <label className="settings-field">{tx("Nama tampilan")}<input value={form.display_name} maxLength={60} onChange={(event) => update("display_name", event.target.value)} placeholder={tx("Nama kamu")} /></label>

          <div className="settings-divider" />
          <div className="settings-section-heading"><div className="settings-heading-icon"><Monitor size={19} /></div><div><h2>{tx("Tampilan")}</h2><p>{tx("Pilih tema visual untuk workspace.")}</p></div></div>
          <div className="settings-choice-grid">
            <button type="button" className={`settings-theme-choice ${form.theme === "dark" ? "selected" : ""}`} onClick={() => update("theme", "dark")}><div className="theme-preview theme-preview-dark"><span /><i /><i /><i /></div><div><strong><Moon size={15} /> {tx("Mode gelap")}</strong><small>{tx("Ruang kerja bernuansa navy gelap")}</small></div>{form.theme === "dark" && <Check size={17} className="settings-selected-check" />}</button>
            <button type="button" className={`settings-theme-choice ${form.theme === "light" ? "selected" : ""}`} onClick={() => update("theme", "light")}><div className="theme-preview theme-preview-light"><span /><i /><i /><i /></div><div><strong><Sun size={15} /> {tx("Mode terang")}</strong><small>{tx("Ruang kerja cerah dan bersih")}</small></div>{form.theme === "light" && <Check size={17} className="settings-selected-check" />}</button>
          </div>

          <div className="settings-divider" />
          <div className="settings-section-heading"><div className="settings-heading-icon"><Wallet size={19} /></div><div><h2>{tx("Preferensi Regional")}</h2><p>{tx("Pengaturan mata uang dan awal minggu kalender.")}</p></div></div>
          <div className="settings-fields-grid">
            <label className="settings-field">{tx("Mata uang tampilan")}<select value={form.currency} onChange={(event) => update("currency", event.target.value as AppSettings["currency"])}><option value="IDR">{tx("IDR — Rupiah Indonesia")}</option><option value="USD">{tx("USD — Dolar Amerika")}</option><option value="SGD">{tx("SGD — Dolar Singapura")}</option></select></label>
            <label className="settings-field">{tx("Awal minggu kalender")}<select value={form.week_start} onChange={(event) => update("week_start", event.target.value as AppSettings["week_start"])}><option value="monday">{form.language === "id" ? "Senin" : "Monday"}</option><option value="sunday">{form.language === "id" ? "Minggu" : "Sunday"}</option></select></label>
          </div>
          <p className="settings-inline-hint">{tx("Format tanggal akan mengikuti bahasa yang dipilih.")}</p>

          {error && <div className="personal-error" role="alert">{error}</div>}
          {message && <div className="settings-success"><Check size={15} />{message}</div>}
          <div className="settings-footer-actions"><button className="cancel-button" onClick={() => { setForm(settings); setError(""); setMessage(""); }} disabled={saving}><RotateCcw size={15} /> {tx("Atur ulang perubahan")}</button><button className="primary-button" onClick={() => void submit(form)} disabled={saving || !form.display_name.trim()}><Save size={16} /> {saving ? tx("Menyimpan pengaturan...") : tx("Simpan pengaturan")}</button></div>
        </section>

        <aside className="settings-side-column">
          <section className="panel settings-info-card"><div className="settings-info-icon"><Monitor size={20} /></div><span className="personal-kicker">{tx("APLIKASI")}</span><h3>MyHub Desktop</h3><p>{tx("Ruang produktivitas pribadi yang berjalan secara lokal.")}</p><div className="settings-info-row"><span>{tx("Versi")}</span><strong>0.1.0</strong></div><div className="settings-info-row"><span>{tx("Penyimpanan")}</span><strong>{tx("Lokal SQLite")}</strong></div><div className="settings-info-row"><span>Platform</span><strong>Tauri 2</strong></div></section>
          <section className="panel settings-info-card settings-data-card"><div className="settings-info-icon"><Wallet size={20} /></div><span className="personal-kicker">{tx("DATA KAMU")}</span><h3>{tx("Penyimpanan lokal")}</h3><p>{tx("Aktivitas, transaksi, agenda, tenggat, dan koleksi tersimpan di database lokal perangkat ini.")}</p><small>{tx("Cadangkan database secara berkala sebelum memindahkan MyHub ke perangkat lain.")}</small></section>
        </aside>
      </div>
    </div>
  );
}
