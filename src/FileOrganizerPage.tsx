import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, File, FileImage, FileSpreadsheet, FileText, Film, FolderOpen,
  HardDrive, Music2, Plus, Search, Trash2, UploadCloud,
} from "lucide-react";
import "./PersonalModules.css";
import {
  addOrganizedFile, deleteOrganizedFile, getOrganizedFiles,
  updateOrganizedFileCategory, type OrganizedFile,
} from "./services/fileOrganizerService";
import { translate, type Language } from "./i18n";

const FILE_CATEGORIES = ["Unsorted", "Documents", "Images", "Videos", "Audio", "Spreadsheets", "Archives", "Other"];

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

function guessCategory(extension: string, mimeType: string): string {
  if (["pdf", "doc", "docx", "txt", "rtf", "md", "ppt", "pptx"].includes(extension)) return "Documents";
  if (["xls", "xlsx", "csv"].includes(extension)) return "Spreadsheets";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(extension) || mimeType.startsWith("image/")) return "Images";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(extension) || mimeType.startsWith("video/")) return "Videos";
  if (["mp3", "wav", "m4a", "ogg", "flac"].includes(extension) || mimeType.startsWith("audio/")) return "Audio";
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) return "Archives";
  return "Unsorted";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FileTypeIcon({ category }: { category: string }) {
  if (category === "Images") return <FileImage size={19} />;
  if (category === "Spreadsheets") return <FileSpreadsheet size={19} />;
  if (category === "Videos") return <Film size={19} />;
  if (category === "Audio") return <Music2 size={19} />;
  if (category === "Documents") return <FileText size={19} />;
  return <File size={19} />;
}

export default function FileOrganizerPage({ language, dateFormat }: { language: Language; dateFormat: "id-ID" | "en-US" }) {
  const tx = (value: string) => translate(language, value);
  const [files, setFiles] = useState<OrganizedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All files");
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() { setFiles(await getOrganizedFiles()); }

  useEffect(() => {
    async function load() {
      try { setLoading(true); setError(""); await refresh(); }
      catch (loadError) {
        console.error("Gagal memuat File Organizer:", loadError);
        setError(language === "id" ? "Pengelola File belum dapat dimuat. Pastikan migrasi tabel file sudah dijalankan." : "File Organizer could not load. Make sure the file table migration has run.");
      } finally { setLoading(false); }
    }
    void load();
  }, []);

  const visibleFiles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return files.filter((item) => categoryFilter === "All files" || item.category === categoryFilter)
      .filter((item) => !keyword || `${item.file_name} ${item.extension} ${item.category} ${item.notes ?? ""}`.toLowerCase().includes(keyword));
  }, [files, search, categoryFilter]);

  const totalBytes = files.reduce((sum, item) => sum + item.size_bytes, 0);
  const categoryCount = new Set(files.map((item) => item.category)).size;

  async function importSelectedFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    try {
      setBusy(true); setError("");
      for (const file of Array.from(fileList)) {
        const extension = extensionOf(file.name);
        await addOrganizedFile({ file_name: file.name, extension, mime_type: file.type || "application/octet-stream", size_bytes: file.size, category: guessCategory(extension, file.type || ""), notes: null });
      }
      await refresh();
    } catch (importError) {
      console.error("Gagal mengimpor metadata file:", importError);
      setError(language === "id" ? "Data file gagal ditambahkan. Periksa tabel organized_files." : "File records could not be added. Check the organized_files table.");
    } finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function changeCategory(item: OrganizedFile, category: string) {
    try { await updateOrganizedFileCategory(item.id, category); await refresh(); }
    catch (updateError) {
      console.error(updateError);
      setError(language === "id" ? "Kategori file gagal diperbarui." : "Could not update file category.");
    }
  }

  async function removeRecord(item: OrganizedFile) {
    const confirmed = language === "id"
      ? window.confirm(`Hapus catatan file "${item.file_name}" dari MyHub? File aslinya tidak akan dihapus.`)
      : window.confirm(`Remove the record for "${item.file_name}" from MyHub? The original file will not be deleted.`);
    if (!confirmed) return;
    try { await deleteOrganizedFile(item.id); await refresh(); }
    catch (deleteError) {
      console.error(deleteError);
      setError(language === "id" ? "Catatan file gagal dihapus." : "Could not remove file record.");
    }
  }

  return (
    <div className="personal-page file-page page-enter">
      <section className="personal-page-heading">
        <div>
          <span className="welcome-eyebrow">{tx("PUSTAKA FILE")}</span>
          <h1>{tx("Pengelola File")}<span>.</span></h1>
          <p>{tx("Kelompokkan dan temukan kembali dokumen yang kamu gunakan dalam aktivitas sehari-hari.")}</p>
        </div>
        <div className="file-import-control">
          <input ref={inputRef} type="file" multiple onChange={(event) => void importSelectedFiles(event.target.files)} aria-label={tx("Pilih file")} />
          <button className="primary-button" onClick={() => inputRef.current?.click()} disabled={busy}><UploadCloud size={17} /> {busy ? tx("Menambahkan file...") : tx("Tambah File")}</button>
        </div>
      </section>

      <section className="personal-summary-grid file-summary-grid">
        <div className="personal-summary-card accent-card"><span>{tx("File Terdata")}</span><strong>{files.length.toString().padStart(2, "0")}</strong><small>{tx("File terdaftar di MyHub")}</small><FolderOpen size={23} /></div>
        <div className="personal-summary-card"><span>{tx("Total Ukuran File")}</span><strong className="file-size-value">{formatBytes(totalBytes)}</strong><small>{tx("Total ukuran file terdaftar")}</small><HardDrive size={23} /></div>
        <div className="personal-summary-card"><span>{tx("Jumlah Kategori")}</span><strong>{categoryCount.toString().padStart(2, "0")}</strong><small>{tx("Kategori terpakai")}</small><Archive size={23} /></div>
      </section>

      <section className="file-library-panel panel">
        <div className="file-library-toolbar">
          <div><span className="personal-kicker">{tx("KATALOG FILE")}</span><h2>{tx("File Saya")}</h2><p>{tx("File yang sudah kamu daftarkan dan kategorikan.")}</p></div>
          <div className="personal-toolbar-actions"><div className="personal-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tx("Cari file...")} /></div><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label={tx("Filter kategori file")}><option value="All files">{tx("Semua file")}</option>{FILE_CATEGORIES.map((category) => <option key={category} value={category}>{tx(category)}</option>)}</select></div>
        </div>
        {error && <div className="personal-error" role="alert">{error}</div>}
        {loading ? <div className="personal-empty">{tx("Memuat daftar file...")}</div> : visibleFiles.length > 0 ? (
          <div className="file-table-wrap"><table className="file-table"><thead><tr><th>{tx("Berkas")}</th><th>{tx("Tipe")}</th><th>{tx("Ukuran")}</th><th>{tx("Kategori")}</th><th>{tx("Ditambahkan")}</th><th></th></tr></thead><tbody>
            {visibleFiles.map((item) => <tr key={item.id}>
              <td><div className={`file-name-cell file-category-${item.category.toLowerCase()}`}><div className="file-type-icon"><FileTypeIcon category={item.category} /></div><div><strong>{item.file_name}</strong><small>{item.mime_type}</small></div></div></td>
              <td><span className="file-extension">{item.extension ? `.${item.extension}` : tx("Berkas")}</span></td>
              <td>{formatBytes(item.size_bytes)}</td>
              <td><select className="file-category-select" value={item.category} onChange={(event) => void changeCategory(item, event.target.value)} aria-label={`${tx("Kategori")} ${item.file_name}`}>{FILE_CATEGORIES.map((category) => <option key={category} value={category}>{tx(category)}</option>)}</select></td>
              <td>{new Date(item.added_at.replace(" ", "T") + (item.added_at.includes("Z") ? "" : "Z")).toLocaleDateString(dateFormat, { day: "2-digit", month: "short", year: "numeric" })}</td>
              <td><button className="personal-icon-button danger" onClick={() => void removeRecord(item)} title={tx("Hapus")} aria-label={`${tx("Hapus")} ${item.file_name}`}><Trash2 size={15} /></button></td>
            </tr>)}
          </tbody></table></div>
        ) : (
          <div className="personal-empty"><div className="personal-empty-icon"><FolderOpen size={25} /></div><strong>{files.length === 0 ? tx("Belum ada file terdaftar") : tx("Tidak ada file yang cocok")}</strong><p>{files.length === 0 ? tx("Pilih file untuk mulai membuat katalog dokumenmu.") : tx("Ubah pencarian atau kategori filter.")}</p>{files.length === 0 && <button className="primary-button" onClick={() => inputRef.current?.click()}><Plus size={16} /> {tx("Tambah file pertama")}</button>}</div>
        )}
      </section>
      <div className="file-info-note"><HardDrive size={15} /><span>{tx("MyHub menyimpan nama, tipe, ukuran, dan kategori file ke SQLite. File asli tetap berada di lokasi asal; versi ini belum memindahkan atau menyalin file secara fisik.")}</span></div>
    </div>
  );
}
