import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import "./SpendNote.css";
import { translate, type Language } from "./i18n";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
  type SpendTransaction,
  type SpendTransactionInput,
  type TransactionType,
} from "./services/spendNoteService";

type SpendNotePageProps = {
  onDataChanged: () => Promise<void>;
  currency?: "IDR" | "USD" | "SGD";
  dateFormat?: "id-ID" | "en-US";
  language: Language;
};

type TransactionForm = {
  title: string;
  amount: string;
  type: TransactionType;
  category: string;
  transaction_date: string;
  payment_method: string;
  notes: string;
};

const INCOME_CATEGORIES = ["Allowance", "Salary", "Freelance", "Business", "Gift", "Other"];
const EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Education", "Health", "Entertainment", "Other"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "E-Wallet", "Debit / Credit Card", "Other"];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthDate(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function formatMoney(value: number, currency: "IDR" | "USD" | "SGD"): string {
  const locale = currency === "IDR" ? "id-ID" : currency === "SGD" ? "en-SG" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string, locale: "id-ID" | "en-US"): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function emptyForm(type: TransactionType = "expense"): TransactionForm {
  return {
    title: "",
    amount: "",
    type,
    category: type === "income" ? "Allowance" : "Food",
    transaction_date: dateKey(new Date()),
    payment_method: "Cash",
    notes: "",
  };
}

export default function SpendNotePage({ onDataChanged, currency = "IDR", dateFormat = "id-ID", language }: SpendNotePageProps) {
  const tx = (value: string) => translate(language, value);
  const [transactions, setTransactions] = useState<SpendTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthKey(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TransactionForm>(() => emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function refreshTransactions() {
    const records = await getTransactions();
    setTransactions(records);
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setPageError("");
        await refreshTransactions();
      } catch (error) {
        console.error("Gagal memuat transaksi SpendNote:", error);
        setPageError(tx("Data transaksi gagal dimuat. Pastikan Migration 4 sudah dijalankan."));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const monthTransactions = useMemo(
    () => transactions.filter((item) => item.transaction_date.startsWith(selectedMonth)),
    [transactions, selectedMonth],
  );

  const balance = useMemo(
    () => transactions.reduce((total, item) => total + (item.type === "income" ? item.amount : -item.amount), 0),
    [transactions],
  );
  const monthIncome = monthTransactions.filter((item) => item.type === "income").reduce((total, item) => total + item.amount, 0);
  const monthExpense = monthTransactions.filter((item) => item.type === "expense").reduce((total, item) => total + item.amount, 0);
  const monthNet = monthIncome - monthExpense;

  const visibleTransactions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...monthTransactions]
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => !keyword || `${item.title} ${item.category} ${item.payment_method} ${item.notes ?? ""}`.toLowerCase().includes(keyword))
      .sort((a, b) => `${b.transaction_date}-${b.id}`.localeCompare(`${a.transaction_date}-${a.id}`));
  }, [monthTransactions, search, typeFilter]);

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of monthTransactions) {
      if (item.type === "expense") totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [monthTransactions]);

  const chartMonths = useMemo(() => {
    const end = monthDate(selectedMonth);
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(end.getFullYear(), end.getMonth() - (5 - index), 1);
      const key = currentMonthKey(date);
      const entries = transactions.filter((item) => item.transaction_date.startsWith(key));
      return {
        key,
        label: date.toLocaleDateString(dateFormat, { month: "short" }),
        income: entries.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0),
        expense: entries.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0),
      };
    });
  }, [transactions, selectedMonth, dateFormat]);

  const chartMaximum = Math.max(1, ...chartMonths.flatMap((item) => [item.income, item.expense]));
  const monthLabel = monthDate(selectedMonth).toLocaleDateString(dateFormat, { month: "long", year: "numeric" });
  const formatCurrency = (value: number) => formatMoney(value, currency);

  function changeMonth(offset: number) {
    const date = monthDate(selectedMonth);
    date.setMonth(date.getMonth() + offset);
    setSelectedMonth(currentMonthKey(date));
  }

  function openCreate(type: TransactionType = "expense") {
    setEditingId(null);
    setForm(emptyForm(type));
    setFormError("");
    setShowModal(true);
  }

  function openEdit(item: SpendTransaction) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      amount: String(item.amount),
      type: item.type,
      category: item.category,
      transaction_date: item.transaction_date,
      payment_method: item.payment_method,
      notes: item.notes ?? "",
    });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
  }

  function updateForm<K extends keyof TransactionForm>(key: K, value: TransactionForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function saveTransaction() {
    const title = form.title.trim();
    const amount = Number(form.amount);
    if (!title || !form.transaction_date) {
      setFormError(tx("Nama transaksi dan tanggal wajib diisi."));
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError(tx("Nominal harus lebih besar dari nol."));
      return;
    }

    const payload: SpendTransactionInput = {
      title,
      amount,
      type: form.type,
      category: form.category.trim() || "Other",
      transaction_date: form.transaction_date,
      payment_method: form.payment_method,
      notes: form.notes.trim() || null,
    };

    try {
      setSaving(true);
      setFormError("");
      if (editingId !== null) await updateTransaction(editingId, payload);
      else await createTransaction(payload);
      await refreshTransactions();
      await onDataChanged();
      setSelectedMonth(payload.transaction_date.slice(0, 7));
      closeModal();
    } catch (error) {
      console.error("Gagal menyimpan transaksi SpendNote:", error);
      setFormError(tx("Transaksi gagal disimpan. Periksa database lalu coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  async function removeTransaction(item: SpendTransaction) {
    if (!window.confirm((language === "id" ? `Hapus transaksi "${item.title}"?` : `Delete transaction "${item.title}"?`))) return;
    try {
      await deleteTransaction(item.id);
      await refreshTransactions();
      await onDataChanged();
    } catch (error) {
      console.error("Gagal menghapus transaksi SpendNote:", error);
      setPageError(tx("Transaksi gagal dihapus. Silakan coba lagi."));
    }
  }

  return (
    <div className="spendnote-page page-enter">
      <section className="spendnote-heading">
        <div>
          <span className="welcome-eyebrow">{tx("Keuangan Pribadi")}</span>
          <h1>SpendNote<span>.</span></h1>
          <p>{tx("Catat pemasukan dan pengeluaran, lalu pantau kondisi keuanganmu.")}</p>
        </div>
        <div className="spendnote-heading-actions">
          <button className="sn-secondary-button" onClick={() => openCreate("income")}><ArrowDownLeft size={16} /> {tx("Tambah pemasukan")}</button>
          <button className="primary-button" onClick={() => openCreate("expense")}><Plus size={17} /> {tx("Tambah transaksi")}</button>
        </div>
      </section>

      {pageError && <div className="sn-error" role="alert">{pageError}</div>}

      <section className="sn-overview-grid">
        <article className="sn-balance-card">
          <div className="sn-balance-card-top"><span>{tx("SALDO TOTALMU")}</span><div className="sn-balance-icon"><Wallet size={19} /></div></div>
          <p>{tx("Saldo bersih dari seluruh transaksi yang sudah dicatat.")}</p>
          <strong>{formatCurrency(balance)}</strong>
          <div className="sn-balance-footer"><span><TrendingUp size={14} /> {tx("Seluruh waktu")}</span><span>{transactions.length} {tx("transaksi")}</span></div>
        </article>
        <article className="sn-summary-card income">
          <div className="sn-summary-top"><span>{tx("PEMASUKAN")}</span><div><ArrowDownLeft size={18} /></div></div>
          <strong>{formatCurrency(monthIncome)}</strong>
          <small>{tx("Total pemasukan pada {month}").replace("{month}", monthLabel)}</small>
        </article>
        <article className="sn-summary-card expense">
          <div className="sn-summary-top"><span>{tx("PENGELUARAN")}</span><div><ArrowUpRight size={18} /></div></div>
          <strong>{formatCurrency(monthExpense)}</strong>
          <small>{tx("Total pengeluaran pada {month}").replace("{month}", monthLabel)}</small>
        </article>
        <article className={`sn-summary-card ${monthNet >= 0 ? "net-positive" : "net-negative"}`}>
          <div className="sn-summary-top"><span>{tx("ARUS KAS BERSIH")}</span><div><ReceiptText size={18} /></div></div>
          <strong>{formatCurrency(monthNet)}</strong>
          <small>{monthNet >= 0 ? tx("Pemasukan lebih besar dari pengeluaran") : tx("Pengeluaran lebih besar dari pemasukan")}</small>
        </article>
      </section>

      <section className="sn-content-grid">
        <article className="panel sn-chart-panel">
          <div className="sn-panel-heading">
            <div><span className="sn-kicker">{tx("RINGKASAN ARUS KAS")}</span><h3>{tx("Pemasukan vs Pengeluaran")}</h3><p>{tx("Perbandingan enam bulan terakhir berdasarkan bulan terpilih.")}</p></div>
            <div className="sn-chart-legend"><span className="legend-income">{tx("Pemasukan")}</span><span className="legend-expense">{tx("Pengeluaran")}</span></div>
          </div>
          <div className="sn-chart">
            {chartMonths.map((month) => (
              <div className={`sn-chart-month ${month.key === selectedMonth ? "selected" : ""}`} key={month.key}>
                <div className="sn-chart-bars">
                  <div className="sn-chart-bar income-bar" style={{ height: `${Math.max(month.income > 0 ? 5 : 0, (month.income / chartMaximum) * 100)}%` }} title={`${tx("Pemasukan")} ${formatCurrency(month.income)}`} />
                  <div className="sn-chart-bar expense-bar" style={{ height: `${Math.max(month.expense > 0 ? 5 : 0, (month.expense / chartMaximum) * 100)}%` }} title={`${tx("Pengeluaran")} ${formatCurrency(month.expense)}`} />
                </div>
                <button onClick={() => setSelectedMonth(month.key)}>{month.label}</button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel sn-category-panel">
          <div className="sn-panel-heading"><div><span className="sn-kicker">{tx("Rincian Pengeluaran")}</span><h3>{tx("Kategori Teratas")}</h3><p>{tx("Pengeluaran pada {month}.").replace("{month}", monthLabel)}</p></div></div>
          {categoryBreakdown.length ? (
            <div className="sn-category-list">
              {categoryBreakdown.map(([category, total]) => (
                <div className="sn-category-row" key={category}>
                  <div className="sn-category-copy"><strong>{tx(category)}</strong><span>{formatCurrency(total)}</span></div>
                  <div className="sn-category-track"><div style={{ width: `${(total / categoryBreakdown[0][1]) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <div className="sn-mini-empty">{tx("Belum ada pengeluaran pada bulan ini.")}</div>}
        </article>
      </section>

      <section className="panel sn-transactions-panel">
        <div className="sn-transactions-heading">
          <div><span className="sn-kicker">{tx("RIWAYAT TRANSAKSI")}</span><h3>{tx("Transaksi Terbaru")}</h3><p>{tx("Riwayat transaksi untuk {month}.").replace("{month}", monthLabel)}</p></div>
          <div className="sn-month-control">
            <button className="icon-button" onClick={() => changeMonth(-1)} aria-label={tx("Bulan sebelumnya")}><ArrowLeft size={16} /></button>
            <strong>{monthLabel}</strong>
            <button className="icon-button" onClick={() => changeMonth(1)} aria-label={tx("Bulan berikutnya")}><ArrowRight size={16} /></button>
          </div>
        </div>

        <div className="sn-transaction-tools">
          <div className="sn-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tx("Cari transaksi, kategori, metode...")} /></div>
          <div className="sn-filter-tabs" role="group" aria-label={tx("Jenis transaksi")}>
            <button className={typeFilter === "all" ? "active" : ""} onClick={() => setTypeFilter("all")}>{tx("Semua")}</button>
            <button className={typeFilter === "income" ? "active" : ""} onClick={() => setTypeFilter("income")}>{tx("Pemasukan")}</button>
            <button className={typeFilter === "expense" ? "active" : ""} onClick={() => setTypeFilter("expense")}>{tx("Pengeluaran")}</button>
          </div>
        </div>

        {loading ? <div className="sn-empty-state">{tx("Memuat transaksi...")}</div> : visibleTransactions.length ? (
          <div className="sn-transaction-list">
            {visibleTransactions.map((item) => (
              <article className="sn-transaction-row" key={item.id}>
                <div className={`sn-transaction-icon ${item.type}`}>
                  {item.type === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="sn-transaction-main"><strong>{item.title}</strong><span>{tx(item.category)} · {tx(item.payment_method)}{item.notes ? ` · ${item.notes}` : ""}</span></div>
                <div className="sn-transaction-date"><CalendarDays size={14} /> {formatDate(item.transaction_date, dateFormat)}</div>
                <strong className={`sn-transaction-amount ${item.type}`}>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount)}</strong>
                <div className="sn-transaction-actions">
                  <button className="mydaily-action-button" onClick={() => openEdit(item)} title={tx("Edit transaksi")} aria-label={`${tx("Edit transaksi")} ${item.title}`}><Pencil size={15} /></button>
                  <button className="mydaily-action-button delete" onClick={() => void removeTransaction(item)} title={tx("Hapus transaksi")} aria-label={`${tx("Hapus transaksi")} ${item.title}`}><Trash2 size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="sn-empty-state">
            <div className="sn-empty-icon"><Wallet size={25} /></div>
            <strong>{monthTransactions.length ? tx("Tidak ada transaksi yang cocok") : tx("Belum ada transaksi bulan ini")}</strong>
            <p>{monthTransactions.length ? tx("Ubah pencarian atau filter transaksi.") : tx("Tambahkan pemasukan atau pengeluaran pertama untuk mulai memantau keuangan.")}</p>
            {!monthTransactions.length && <button className="primary-button" onClick={() => openCreate("expense")}><Plus size={16} /> {tx("Tambah transaksi pertama")}</button>}
          </div>
        )}
      </section>

      <p className="sn-footnote">{tx("Saldo dihitung dari total pemasukan dikurangi total pengeluaran yang dicatat di SpendNote. Transaksi disimpan secara lokal di perangkat ini.")}</p>

      {showModal && (
        <div className="sn-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closeModal(); }}>
          <div className="sn-modal">
            <div className="sn-modal-header"><div><span>{tx("TRANSAKSI SPENDNOTE")}</span><h3>{editingId !== null ? tx("Edit transaksi") : tx("Tambah transaksi baru")}</h3></div><button className="icon-button" onClick={closeModal} aria-label={tx("Tutup dialog")}><X size={18} /></button></div>
            <div className="sn-type-switch" role="group" aria-label={tx("Jenis transaksi")}>
              <button className={form.type === "income" ? "active income" : ""} onClick={() => { updateForm("type", "income"); updateForm("category", INCOME_CATEGORIES[0]); }}><ArrowDownLeft size={16} /> {tx("Pemasukan")}</button>
              <button className={form.type === "expense" ? "active expense" : ""} onClick={() => { updateForm("type", "expense"); updateForm("category", EXPENSE_CATEGORIES[0]); }}><ArrowUpRight size={16} /> {tx("Pengeluaran")}</button>
            </div>
            <label htmlFor="sn-title">{tx("Nama transaksi")}</label>
            <input id="sn-title" value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder={tx("Contoh: Uang saku bulanan")} autoFocus />
            <div className="sn-form-grid">
              <div><label htmlFor="sn-amount">{tx("Nominal")}</label><input id="sn-amount" type="number" min="1" step="1" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} placeholder={language === "id" ? "50000" : "50.00"} /></div>
              <div><label htmlFor="sn-date">{tx("Tanggal transaksi")}</label><input id="sn-date" type="date" value={form.transaction_date} onChange={(event) => updateForm("transaction_date", event.target.value)} /></div>
              <div><label htmlFor="sn-category">{tx("Kategori")}</label><select id="sn-category" value={form.category} onChange={(event) => updateForm("category", event.target.value)}>{(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => <option key={category} value={category}>{tx(category)}</option>)}</select></div>
              <div><label htmlFor="sn-method">{tx("Metode pembayaran")}</label><select id="sn-method" value={form.payment_method} onChange={(event) => updateForm("payment_method", event.target.value)}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{tx(method)}</option>)}</select></div>
            </div>
            <label htmlFor="sn-notes">{tx("Catatan (opsional)")}</label>
            <textarea id="sn-notes" rows={3} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder={tx("Tambahkan detail transaksi ini...")} />
            {formError && <p className="sn-error" role="alert">{formError}</p>}
            <div className="sn-modal-actions"><button className="cancel-button" onClick={closeModal} disabled={saving}>{tx("Batal")}</button><button className="primary-button" onClick={() => void saveTransaction()} disabled={saving || !form.title.trim() || !form.amount || Number(form.amount) <= 0}>{saving ? tx("Menyimpan...") : editingId !== null ? <><Check size={16} /> {tx("Simpan Perubahan")}</> : <><Plus size={16} /> {tx("Simpan Transaksi")}</>}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
