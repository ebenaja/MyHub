import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import "./Calendar.css";
import { translate, type Language } from "./i18n";
import {
  createEvent,
  deleteEvent,
  updateEvent,
  type CalendarEvent,
  type CalendarEventInput,
} from "./services/calendarService";

type CalendarPageProps = {
  events: CalendarEvent[];
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
  weekStartsOn?: "monday" | "sunday";
  dateFormat?: "id-ID" | "en-US";
  language: Language;
};

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatLongDate(value: string, locale: "id-ID" | "en-US"): string {
  return parseDate(value).toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function emptyForm(date: string): CalendarEventInput {
  return {
    title: "",
    category: "Personal",
    event_date: date,
    start_time: null,
    end_time: null,
    location: null,
    description: null,
  };
}

export default function CalendarPage({ events, loading, error, onRefresh, weekStartsOn = "monday", dateFormat = "id-ID", language }: CalendarPageProps) {
  const tx = (value: string) => translate(language, value);
  const now = new Date();
  const [visibleMonth, setVisibleMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(now));
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CalendarEventInput>(() => emptyForm(dateKey(now)));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const monthLabel = visibleMonth.toLocaleDateString(dateFormat, { month: "long", year: "numeric" });
  const weekdayBase = Array.from({ length: 7 }, (_, index) => { const day = new Date(2024, 0, 7 + index); return day.toLocaleDateString(language === "id" ? "id-ID" : "en-US", { weekday: "short" }); });
  const weekdays = weekStartsOn === "monday" ? [...weekdayBase.slice(1), weekdayBase[0]] : weekdayBase;
  const weekOffset = weekStartsOn === "monday" ? 1 : 0;
  const calendarDays = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - ((firstDay.getDay() - weekOffset + 7) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [visibleMonth, weekOffset]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const current = grouped.get(event.event_date) ?? [];
      current.push(event);
      grouped.set(event.event_date, current);
    }
    return grouped;
  }, [events]);

  const selectedEvents = (eventsByDate.get(selectedDate) ?? []).slice().sort((a, b) =>
    (a.start_time ?? "").localeCompare(b.start_time ?? ""),
  );

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function goToToday() {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateKey(today));
  }

  function openCreate(date = selectedDate) {
    setEditingId(null);
    setForm(emptyForm(date));
    setFormError("");
    setShowModal(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      category: event.category,
      event_date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      description: event.description,
    });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormError("");
  }

  async function saveEvent() {
    const title = form.title.trim();
    if (!title || !form.event_date) {
      setFormError(tx("Nama agenda dan tanggal wajib diisi."));
      return;
    }
    if (form.start_time && form.end_time && form.end_time < form.start_time) {
      setFormError(tx("Waktu selesai tidak boleh lebih awal daripada waktu mulai."));
      return;
    }

    const payload: CalendarEventInput = {
      ...form,
      title,
      category: form.category.trim() || "Personal",
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location?.trim() || null,
      description: form.description?.trim() || null,
    };

    try {
      setSaving(true);
      setFormError("");
      if (editingId !== null) {
        await updateEvent(editingId, payload);
      } else {
        await createEvent(payload);
      }
      await onRefresh();
      setSelectedDate(payload.event_date);
      const chosen = parseDate(payload.event_date);
      setVisibleMonth(new Date(chosen.getFullYear(), chosen.getMonth(), 1));
      closeModal();
    } catch (saveError) {
      console.error("Gagal menyimpan event:", saveError);
      setFormError(tx("Agenda gagal disimpan. Pastikan tabel events sudah tersedia."));
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent(event: CalendarEvent) {
    if (!window.confirm((language === "id" ? `Hapus agenda "${event.title}"?` : `Delete event "${event.title}"?`))) return;
    try {
      await deleteEvent(event.id);
      await onRefresh();
    } catch (deleteError) {
      console.error("Gagal menghapus event:", deleteError);
      setFormError(tx("Agenda gagal dihapus. Silakan coba lagi."));
    }
  }

  return (
    <div className="calendar-page page-enter">
      <section className="calendar-heading">
        <div>
          <span className="welcome-eyebrow">{tx("RUANG KERJA MYHUB / PERENCANA")}</span>
          <h1>{tx("Kalender")}<span>.</span></h1>
          <p>{tx("Atur event, agenda, dan kegiatan penting dalam satu kalender.")}</p>
        </div>
        <button className="primary-button" onClick={() => openCreate()}>
          <Plus size={17} /> {tx("Acara Baru")}
        </button>
      </section>

      {error && <div className="calendar-error" role="alert">{error}</div>}

      <div className="calendar-layout">
        <section className="panel calendar-main-panel">
          <div className="calendar-toolbar">
            <div>
              <span className="calendar-kicker">{tx("Jadwalmu")}</span>
              <h2>{monthLabel}</h2>
            </div>
            <div className="calendar-toolbar-actions">
              <button className="calendar-today-button" onClick={goToToday}>{tx("Hari ini")}</button>
              <button className="icon-button" onClick={() => changeMonth(-1)} aria-label={tx("Bulan sebelumnya")}><ArrowLeft size={17} /></button>
              <button className="icon-button" onClick={() => changeMonth(1)} aria-label={tx("Bulan berikutnya")}><ArrowRight size={17} /></button>
            </div>
          </div>

          <div className="calendar-grid">
            {weekdays.map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
            {calendarDays.map((day) => {
              const key = dateKey(day);
              const dayEvents = eventsByDate.get(key) ?? [];
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              const isToday = key === dateKey(new Date());
              const isSelected = key === selectedDate;
              return (
                <button
                  className={`calendar-day ${inMonth ? "in-month" : "outside-month"} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  aria-label={`${formatLongDate(key, dateFormat)}${dayEvents.length ? (language === "id" ? `, ${dayEvents.length} agenda` : `, ${dayEvents.length} events`) : ""}`}
                >
                  <span className="calendar-day-number">{day.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <span className="calendar-day-events">
                      <span className="calendar-event-dots">
                        {dayEvents.slice(0, 3).map((event) => <i key={event.id} className={`event-dot ${event.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} />)}
                      </span>
                      <small>{dayEvents.length} {tx("agenda")}</small>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="calendar-legend">
            <span><i className="legend-dot today-dot" /> {tx("Hari ini")}</span>
            <span><i className="legend-dot selected-dot" /> {tx("Tanggal dipilih")}</span>
            <span><i className="legend-dot event-dot-legend" /> {tx("Memiliki agenda")}</span>
          </div>
        </section>

        <aside className="panel calendar-agenda-panel">
          <div className="calendar-agenda-heading">
            <div>
              <span className="calendar-kicker">{tx("AGENDA HARIAN")}</span>
              <h3>{parseDate(selectedDate).toLocaleDateString(dateFormat, { month: "short", day: "numeric" })}</h3>
              <p>{parseDate(selectedDate).toLocaleDateString(dateFormat, { weekday: "long", year: "numeric" })}</p>
            </div>
            <button className="calendar-add-small" onClick={() => openCreate(selectedDate)} aria-label={tx("Tambah agenda pada tanggal terpilih")}><Plus size={18} /></button>
          </div>

          {loading ? (
            <div className="calendar-empty">{tx("Memuat agenda...")}</div>
          ) : selectedEvents.length > 0 ? (
            <div className="calendar-agenda-list">
              {selectedEvents.map((event) => (
                <article className="calendar-event-card" key={event.id}>
                  <div className="calendar-event-accent" />
                  <div className="calendar-event-card-content">
                    <div className="calendar-event-card-top">
                      <span className="calendar-event-category">{tx(event.category)}</span>
                      <div className="calendar-event-actions">
                        <button onClick={() => openEdit(event)} title={tx("Edit agenda")} aria-label={`${tx("Edit agenda")} ${event.title}`}><Pencil size={14} /></button>
                        <button onClick={() => void removeEvent(event)} title={tx("Hapus agenda")} aria-label={`${tx("Hapus agenda")} ${event.title}`}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <strong>{event.title}</strong>
                    {(event.start_time || event.end_time) && <span className="calendar-event-meta"><Clock3 size={13} /> {event.start_time ?? "--:--"}{event.end_time ? ` – ${event.end_time}` : ""}</span>}
                    {event.location && <span className="calendar-event-meta"><MapPin size={13} /> {event.location}</span>}
                    {event.description && <p>{event.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="calendar-empty">
              <div className="calendar-empty-icon"><CalendarDays size={24} /></div>
              <strong>{tx("Tidak ada agenda terjadwal")}</strong>
              <p>{tx("Tambahkan agenda untuk tanggal yang dipilih.")}</p>
              <button className="calendar-create-link" onClick={() => openCreate(selectedDate)}><Plus size={15} /> {tx("Tambah agenda")}</button>
            </div>
          )}
          <div className="calendar-agenda-footer">{events.length} {language === "id" ? "agenda tersimpan" : "saved events"}</div>
        </aside>
      </div>

      <section className="panel calendar-upcoming-panel">
        <div className="panel-header">
          <div><h3>{tx("Semua Agenda Mendatang")}</h3><p>{tx("Agenda berikutnya yang tersimpan di MyHub.")}</p></div>
          <span className="calendar-upcoming-count">{events.filter((event) => event.event_date >= dateKey(new Date())).length} {tx("mendatang")}</span>
        </div>
        {events.filter((event) => event.event_date >= dateKey(new Date())).length > 0 ? (
          <div className="calendar-upcoming-list">
            {events.filter((event) => event.event_date >= dateKey(new Date())).slice(0, 6).map((event) => (
              <button className="calendar-upcoming-row" key={event.id} onClick={() => { setSelectedDate(event.event_date); const date = parseDate(event.event_date); setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }}>
                <span>{parseDate(event.event_date).toLocaleDateString(language === "id" ? "id-ID" : "en-US", { month: "short", day: "numeric" })}</span>
                <strong>{event.title}</strong>
                <small>{tx(event.category)}</small>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        ) : <div className="calendar-empty compact">{tx("Belum ada agenda mendatang.")}</div>}
      </section>

      {showModal && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <form className="task-modal calendar-modal" onSubmit={(event) => { event.preventDefault(); void saveEvent(); }}>
            <div className="modal-header">
              <div><span>{language === "id" ? "KALENDER MYHUB" : "MYHUB CALENDAR"}</span><h3>{editingId !== null ? tx("Edit agenda") : tx("Buat agenda baru")}</h3></div>
              <button type="button" className="icon-button" onClick={closeModal} aria-label={tx("Tutup dialog")}><X size={19} /></button>
            </div>
            <label htmlFor="event-title">{tx("Nama agenda")}</label>
            <input id="event-title" autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={tx("Contoh: Rapat Tim")} />
            <div className="calendar-form-grid">
              <div><label htmlFor="event-category">{tx("Kategori")}</label><select id="event-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="Personal">{tx("Pribadi")}</option><option value="University">{tx("Kuliah")}</option><option value="Work">{tx("Kerja")}</option><option value="Meeting">{tx("Rapat")}</option><option value="Assignment">{tx("Tugas")}</option><option value="Other">{tx("Lainnya")}</option></select></div>
              <div><label htmlFor="event-date">{tx("Tanggal")}</label><input id="event-date" type="date" value={form.event_date} onChange={(event) => setForm({ ...form, event_date: event.target.value })} /></div>
              <div><label htmlFor="event-start">{tx("Waktu mulai")}</label><input id="event-start" type="time" value={form.start_time ?? ""} onChange={(event) => setForm({ ...form, start_time: event.target.value || null })} /></div>
              <div><label htmlFor="event-end">{tx("Waktu selesai")}</label><input id="event-end" type="time" value={form.end_time ?? ""} onChange={(event) => setForm({ ...form, end_time: event.target.value || null })} /></div>
            </div>
            <label htmlFor="event-location">{tx("Lokasi (opsional)")}</label>
            <input id="event-location" value={form.location ?? ""} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder={tx("Di mana kegiatan ini berlangsung?")} />
            <label htmlFor="event-description">{tx("Deskripsi (opsional)")}</label>
            <textarea id="event-description" rows={3} value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={tx("Detail tambahan...")} />
            {formError && <p className="calendar-error" role="alert">{formError}</p>}
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={closeModal}>{tx("Batal")}</button>
              <button type="submit" className="primary-button" disabled={saving || !form.title.trim() || !form.event_date}><Plus size={16} /> {saving ? tx("Menyimpan...") : editingId !== null ? tx("Simpan Perubahan") : tx("Buat Agenda")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
