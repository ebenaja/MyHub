import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bookmark,
  Check,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Lightbulb,
  Link2,
  NotebookPen,
  Pencil,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import "./PersonalModules.css";
import { translate, type Language } from "./i18n";
import {
  createQuickVaultItem,
  deleteQuickVaultItem,
  getQuickVaultItems,
  setQuickVaultArchived,
  setQuickVaultPinned,
  updateQuickVaultItem,
  type QuickVaultInput,
  type QuickVaultItem,
  type QuickVaultKind,
} from "./services/quickVaultService";

type FormState = {
  title: string;
  kind: QuickVaultKind;
  category: string;
  content: string;
  url: string;
  tags: string;
};

const emptyForm: FormState = {
  title: "",
  kind: "note",
  category: "Personal",
  content: "",
  url: "",
  tags: "",
};

function kindLabel(kind: QuickVaultKind, language: Language): string {
  const labels: Record<QuickVaultKind, string> = { note: "Catatan", link: "Tautan", idea: "Ide", snippet: "Potongan kode" };
  return translate(language, labels[kind]);
}

function KindIcon({ kind }: { kind: QuickVaultKind }) {
  if (kind === "link") return <Link2 size={18} />;
  if (kind === "idea") return <Lightbulb size={18} />;
  if (kind === "snippet") return <Code2 size={18} />;
  return <FileText size={18} />;
}

export default function QuickVaultPage({ language }: { language: Language }) {
  const tx = (value: string) => translate(language, value);
  const [items, setItems] = useState<QuickVaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | QuickVaultKind>("all");
  const [view, setView] = useState<"active" | "archived">("active");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const records = await getQuickVaultItems();
    setItems(records);
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        await refresh();
      } catch (loadError) {
        console.error("Gagal memuat QuickVault:", loadError);
        setError(tx("QuickVault belum dapat dimuat. Pastikan Migration 5 sudah dijalankan."));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => (view === "archived" ? item.is_archived === 1 : item.is_archived === 0))
      .filter((item) => kindFilter === "all" || item.kind === kindFilter)
      .filter((item) => !keyword || `${item.title} ${item.category} ${item.content} ${item.tags ?? ""} ${item.url ?? ""}`.toLowerCase().includes(keyword));
  }, [items, search, kindFilter, view]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEdit(item: QuickVaultItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      kind: item.kind,
      category: item.category,
      content: item.content,
      url: item.url ?? "",
      tags: item.tags ?? "",
    });
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveItem() {
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      setError(tx("Judul dan isi catatan wajib diisi."));
      return;
    }
    if (form.kind === "link" && form.url.trim() && !/^https?:\/\//i.test(form.url.trim())) {
      setError(tx("URL harus diawali http:// atau https://."));
      return;
    }

    const payload: QuickVaultInput = {
      title,
      kind: form.kind,
      category: form.category.trim() || "Personal",
      content,
      url: form.url.trim() || null,
      tags: form.tags.trim() || null,
    };

    try {
      setSaving(true);
      setError("");
      if (editingId !== null) await updateQuickVaultItem(editingId, payload);
      else await createQuickVaultItem(payload);
      await refresh();
      closeModal();
    } catch (saveError) {
      console.error("Gagal menyimpan QuickVault:", saveError);
      setError(tx("Item gagal disimpan. Pastikan tabel quickvault_items tersedia."));
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(item: QuickVaultItem) {
    try {
      await setQuickVaultPinned(item.id, item.is_pinned !== 1);
      await refresh();
    } catch (actionError) {
      console.error(actionError);
      setError(tx("Status pin gagal diperbarui."));
    }
  }

  async function toggleArchive(item: QuickVaultItem) {
    try {
      await setQuickVaultArchived(item.id, item.is_archived !== 1);
      await refresh();
    } catch (actionError) {
      console.error(actionError);
      setError(tx("Status arsip gagal diperbarui."));
    }
  }

  async function removeItem(item: QuickVaultItem) {
    if (!window.confirm((language === "id" ? `Hapus "${item.title}" dari QuickVault?` : `Delete "${item.title}" from QuickVault?`))) return;
    try {
      await deleteQuickVaultItem(item.id);
      await refresh();
    } catch (actionError) {
      console.error(actionError);
      setError(tx("Item gagal dihapus."));
    }
  }

  async function copyContent(item: QuickVaultItem) {
    const value = item.url ? `${item.title}\n${item.url}\n\n${item.content}` : item.content;
    try {
      await navigator.clipboard.writeText(value);
      setError("");
    } catch (copyError) {
      console.error(copyError);
      setError(tx("Clipboard tidak tersedia di perangkat ini."));
    }
  }

  const pinnedCount = items.filter((item) => item.is_pinned === 1 && item.is_archived === 0).length;

  return (
    <div className="personal-page qv-page page-enter">
      <section className="personal-page-heading">
        <div>
          <span className="welcome-eyebrow">{tx("Buku Catatan Pribadi")}</span>
          <h1>QuickVault<span>.</span></h1>
          <p>{tx("Simpan catatan, tautan, ide, dan potongan informasi penting dalam satu tempat.")}</p>
        </div>
        <button className="primary-button" onClick={openCreate}><Plus size={17} /> {tx("Item Baru")}</button>
      </section>

      <section className="personal-summary-grid qv-summary-grid">
        <div className="personal-summary-card accent-card"><span>{tx("Total Item")}</span><strong>{items.length.toString().padStart(2, "0")}</strong><small>{tx("Semua item tersimpan")}</small><NotebookPen size={24} /></div>
        <div className="personal-summary-card"><span>{tx("Disematkan")}</span><strong>{pinnedCount.toString().padStart(2, "0")}</strong><small>{tx("Akses cepat")}</small><Pin size={23} /></div>
        <div className="personal-summary-card"><span>{tx("Catatan & Ide")}</span><strong>{items.filter((item) => item.kind === "note" || item.kind === "idea").length.toString().padStart(2, "0")}</strong><small>{tx("Catatan personal")}</small><Lightbulb size={23} /></div>
        <div className="personal-summary-card"><span>{tx("Tautan & Snippet")}</span><strong>{items.filter((item) => item.kind === "link" || item.kind === "snippet").length.toString().padStart(2, "0")}</strong><small>{tx("Referensi tersimpan")}</small><Bookmark size={23} /></div>
      </section>

      <section className="personal-toolbar panel">
        <div className="personal-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tx("Cari judul, isi, kategori, atau tag...")} /></div>
        <div className="personal-toolbar-actions">
          <div className="personal-segmented">
            <button className={view === "active" ? "active" : ""} onClick={() => setView("active")}>{language === "id" ? "Pustaka" : "Library"}</button>
            <button className={view === "archived" ? "active" : ""} onClick={() => setView("archived")}>{language === "id" ? "Arsip" : "Archived"}</button>
          </div>
          <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)} aria-label={tx("Semua jenis")}>
            <option value="all">{tx("Semua jenis")}</option><option value="note">{tx("Catatan")}</option><option value="link">{tx("Tautan")}</option><option value="idea">{tx("Ide")}</option><option value="snippet">{tx("Potongan kode")}</option>
          </select>
        </div>
      </section>

      {error && <div className="personal-error" role="alert">{error}</div>}
      {loading ? <div className="personal-empty panel">{tx("Memuat QuickVault...")}</div> : visibleItems.length > 0 ? (
        <section className="qv-grid">
          {visibleItems.map((item) => (
            <article className={`qv-card panel ${item.is_pinned ? "is-pinned" : ""}`} key={item.id}>
              <div className="qv-card-top"><div className={`qv-kind-icon kind-${item.kind}`}><KindIcon kind={item.kind} /></div><div className="qv-card-badges"><span>{kindLabel(item.kind, language)}</span>{item.is_pinned === 1 && <Pin size={13} />}</div></div>
              <div className="qv-card-copy"><span className="qv-category">{tx(item.category)}</span><h3>{item.title}</h3><p>{item.content}</p></div>
              {item.url && <a className="qv-link" href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> {tx("Buka tautan tersimpan")}</a>}
              {item.tags && <div className="qv-tags">{item.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
              <div className="qv-card-footer"><span>{tx("Diperbarui {date}").replace("{date}", new Date(item.updated_at.replace(" ", "T") + (item.updated_at.includes("Z") ? "" : "Z")).toLocaleDateString(language === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" }))}</span><div>
                <button onClick={() => void copyContent(item)} title={tx("Salin isi")} aria-label={tx("Salin isi")}><Copy size={15} /></button>
                <button onClick={() => void togglePin(item)} title={item.is_pinned ? tx("Lepas sematan") : tx("Sematkan")} aria-label={tx("Sematkan")}><Star size={15} fill={item.is_pinned ? "currentColor" : "none"} /></button>
                <button onClick={() => void toggleArchive(item)} title={item.is_archived ? tx("Pulihkan") : tx("Arsipkan")} aria-label={tx("Arsipkan")}><Archive size={15} /></button>
                <button onClick={() => openEdit(item)} title={tx("Edit item")} aria-label={tx("Edit item")}><Pencil size={15} /></button>
                <button className="danger" onClick={() => void removeItem(item)} title={tx("Hapus")} aria-label={tx("Hapus")}><Trash2 size={15} /></button>
              </div></div>
            </article>
          ))}
        </section>
      ) : (
        <div className="personal-empty panel"><div className="personal-empty-icon"><NotebookPen size={25} /></div><strong>{items.length === 0 ? tx("QuickVault masih kosong") : tx("Tidak ada item yang cocok")}</strong><p>{items.length === 0 ? tx("Simpan catatan atau tautan pertamamu di sini.") : tx("Coba kata kunci atau filter yang berbeda.")}</p>{items.length === 0 && <button className="primary-button" onClick={openCreate}><Plus size={16} /> {tx("Buat item pertama")}</button>}</div>
      )}

      <div className="qv-privacy-note"><Bookmark size={15} /><span>{tx("QuickVault menyimpan data secara lokal di SQLite. Konten belum dienkripsi; jangan simpan password, PIN, atau secret penting di sini.")}</span></div>

      {showModal && <div className="personal-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
        <form className="personal-modal" onSubmit={(event) => { event.preventDefault(); void saveItem(); }}>
          <div className="personal-modal-heading"><div><span>QUICKVAULT</span><h2>{editingId === null ? tx("Buat item baru") : tx("Edit item")}</h2></div><button type="button" className="personal-icon-button" onClick={closeModal}><X size={18} /></button></div>
          <label>{tx("Judul")}<input autoFocus value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} placeholder={tx("Beri nama untuk item ini")} /></label>
          <div className="personal-form-row"><label>{tx("Jenis")}<select value={form.kind} onChange={(event) => setForm((old) => ({ ...old, kind: event.target.value as QuickVaultKind }))}><option value="note">{tx("Catatan")}</option><option value="link">{tx("Tautan")}</option><option value="idea">{tx("Ide")}</option><option value="snippet">{tx("Potongan kode")}</option></select></label><label>{tx("Kategori")}<input value={form.category === "Personal" ? tx("Pribadi") : form.category} onChange={(event) => setForm((old) => ({ ...old, category: event.target.value === tx("Pribadi") ? "Personal" : event.target.value }))} placeholder={language === "id" ? "Pribadi, Kuliah..." : "Personal, Study..."} /></label></div>
          {form.kind === "link" && <label>URL<input value={form.url} onChange={(event) => setForm((old) => ({ ...old, url: event.target.value }))} placeholder="https://example.com" /></label>}
          <label>{tx("Isi")}<textarea rows={6} value={form.content} onChange={(event) => setForm((old) => ({ ...old, content: event.target.value }))} placeholder={tx("Tulis catatan, ide, atau snippet...")} /></label>
          <label>{tx("Tag")} <small>{tx("(pisahkan dengan koma)")}</small><input value={form.tags} onChange={(event) => setForm((old) => ({ ...old, tags: event.target.value }))} placeholder={language === "id" ? "kuliah, proyek, referensi" : "study, project, reference"} /></label>
          {error && <p className="personal-error">{error}</p>}
          <div className="personal-modal-actions"><button type="button" className="cancel-button" onClick={closeModal}>{tx("Batal")}</button><button type="submit" className="primary-button" disabled={saving || !form.title.trim() || !form.content.trim()}>{saving ? tx("Menyimpan...") : <><Check size={16} /> {tx("Simpan item")}</>}</button></div>
        </form>
      </div>}
    </div>
  );
}
