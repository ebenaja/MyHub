
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  CheckSquare,
  Wallet,
  NotebookPen,
  Clock3,
  FolderOpen,
  Settings,
  Search,
  Bell,
  Plus,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Sun,
  Moon,
  GraduationCap,
  ArrowUpRight,
  TrendingUp,
  Check,
  X,
  Pencil,
  Trash2,
  Command,
  Sparkles,
} from "lucide-react";
import "./App.css";
import "./MyDaily.css";
import "./Deadlines.css";
import CalendarPage from "./CalendarPage";
import SpendNotePage from "./SpendNotePage";
import QuickVaultPage from "./QuickVaultPage";
import FileOrganizerPage from "./FileOrganizerPage";
import SettingsPage from "./SettingsPage";
import { translate, type Language } from "./i18n";
import { DEFAULT_APP_SETTINGS, getAppSettings, saveAppSettings, type AppSettings } from "./services/settingsService";
import { getFinanceSummary, type FinanceSummary } from "./services/spendNoteService";
import { getEvents, type CalendarEvent } from "./services/calendarService";
import {
  createTask as saveTask,
  getTasks as fetchTasks,
  updateTaskStatus,
  updateTask as editTask,
  deleteTask as removeTask,
} from "./services/taskService";
import {
  createDeadline,
  deleteDeadline,
  getDeadlines,
  updateDeadline,
  updateDeadlineStatus,
  type Deadline as DeadlineRecord,
} from "./services/deadlineService";

import "./VisualRefresh.css";
import "./LayoutFix.css";

type Task = {
  id: number;
  title: string;
  category: string;
  time: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
};

type Deadline = DeadlineRecord;

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCompactCurrency(value: number, currency: AppSettings["currency"]): string {
  const locale = currency === "IDR" ? "id-ID" : currency === "SGD" ? "en-SG" : "en-US";
  const compact = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.abs(value));
  return value < 0 ? `-${compact}` : compact;
}

const navigation = [
  {
    label: "OVERVIEW",
    items: [
      { name: "Dashboard", icon: LayoutDashboard },
      { name: "MyDaily", icon: CalendarDays },
      { name: "Calendar", icon: CalendarClock },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { name: "Deadlines", icon: Clock3 },
      { name: "SpendNote", icon: Wallet },
      { name: "QuickVault", icon: NotebookPen },
      { name: "File Organizer", icon: FolderOpen },
    ],
  },
  {
    label: "ACADEMIC",
    items: [
      { name: "Class Roster", icon: GraduationCap },
    ],
  },
];

const schedule = [
  {
    time: "08:00",
    end: "09:40",
    subject: "Software Engineering",
    room: "Room 301",
    color: "purple",
  },
  {
    time: "10:00",
    end: "11:40",
    subject: "Artificial Intelligence",
    room: "Room 204",
    color: "blue",
  },
  {
    time: "13:00",
    end: "14:40",
    subject: "Database Systems",
    room: "Room 105",
    color: "green",
  },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const language: Language = appSettings.language;
  const tx = (value: string) => translate(language, value);
  const isDark = appSettings.theme === "dark";
  const displayName = appSettings.display_name.trim() || DEFAULT_APP_SETTINGS.display_name;
  const firstName = displayName.split(/\s+/)[0] || "there";
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newCategory, setNewCategory] = useState("Personal");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskError, setTaskError] = useState("");

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [deadlineLoading, setDeadlineLoading] = useState(true);
  const [deadlineError, setDeadlineError] = useState("");
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<number | null>(null);
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineSubject, setDeadlineSubject] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlinePriority, setDeadlinePriority] = useState<"low" | "medium" | "high">("medium");
  const [deadlineDescription, setDeadlineDescription] = useState("");

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({
    balance: 0,
    month_income: 0,
    month_expense: 0,
  });

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Keep every newly opened module at the top of the content viewport.
  useEffect(() => {
    const content = document.querySelector<HTMLElement>(".main-content");
    content?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activePage]);

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const saved = await getAppSettings();
        if (mounted) setAppSettings(saved);
      } catch (error) {
        console.error("Gagal memuat pengaturan MyHub:", error);
      }
    }
    void loadSettings();
    return () => { mounted = false; };
  }, []);

  async function persistUserSettings(next: AppSettings) {
    await saveAppSettings(next);
    setAppSettings(next);
  }

  async function toggleTheme() {
    try {
      await persistUserSettings({ ...appSettings, theme: isDark ? "light" : "dark" });
    } catch (error) {
      console.error("Gagal menyimpan tema:", error);
      window.alert(language === "id" ? "Tema gagal disimpan. Pastikan migrasi pengaturan sudah dijalankan." : "Could not save theme. Make sure the settings migration has run.");
    }
  }

  async function refreshTasks() {
    const databaseTasks = await fetchTasks();
    const formattedTasks: Task[] = databaseTasks.map((task) => ({
      id: task.id,
      title: task.title,
      category: task.category,
      time: "Anytime",
      completed: task.completed === 1,
      priority: task.priority,
    }));
    setTasks(formattedTasks);
  }

  useEffect(() => {
    async function loadTasks() {
      try {
        setTaskLoading(true);
        setTaskError("");
        await refreshTasks();
        console.log("Aktivitas berhasil dimuat dari SQLite.");
      } catch (error) {
        console.error("Gagal memuat aktivitas:", error);
        setTaskError(language === "id" ? "Aktivitas gagal dimuat dari database. Periksa koneksi SQLite." : "Could not load activities from the database. Check the SQLite connection.");
      } finally {
        setTaskLoading(false);
      }
    }

    void loadTasks();
  }, []);

  async function refreshDeadlines() {
    const records = await getDeadlines();
    setDeadlines(records);
  }

  useEffect(() => {
    async function loadDeadlines() {
      try {
        setDeadlineLoading(true);
        setDeadlineError("");
        await refreshDeadlines();
      } catch (error) {
        console.error("Gagal memuat deadlines:", error);
        setDeadlineError(language === "id" ? "Tenggat gagal dimuat dari database." : "Could not load deadlines from the database.");
      } finally {
        setDeadlineLoading(false);
      }
    }

    void loadDeadlines();
  }, []);

  async function refreshEvents() {
    const records = await getEvents();
    setEvents(records);
  }

  useEffect(() => {
    async function loadEvents() {
      try {
        setEventLoading(true);
        setEventError("");
        await refreshEvents();
      } catch (error) {
        console.error("Gagal memuat calendar events:", error);
        setEventError(language === "id" ? "Agenda gagal dimuat. Pastikan migrasi Kalender sudah dijalankan." : "Could not load events. Make sure the Calendar migration has run.");
      } finally {
        setEventLoading(false);
      }
    }

    void loadEvents();
  }, []);

  async function refreshFinanceSummary() {
    const summary = await getFinanceSummary(getMonthKey(new Date()));
    setFinanceSummary(summary);
  }

  useEffect(() => {
    void refreshFinanceSummary().catch((error) => {
      console.error("Gagal memuat ringkasan SpendNote:", error);
    });
  }, []);

  function formatDeadlineDate(dateValue: string) {
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString(appSettings.date_format, { month: "short", day: "numeric" });
  }

  function getDaysRemaining(dateValue: string) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const dueDate = new Date(`${dateValue}T00:00:00`);
    const difference = Math.ceil((dueDate.getTime() - todayDate.getTime()) / 86400000);
    if (difference < 0) return language === "id" ? `Terlambat ${Math.abs(difference)} hari` : `${Math.abs(difference)} days overdue`;
    if (difference === 0) return language === "id" ? "Jatuh tempo hari ini" : "Due today";
    if (difference === 1) return language === "id" ? "1 hari lagi" : "1 day left";
    return language === "id" ? `${difference} hari lagi` : `${difference} days left`;
  }

  function openCreateDeadline() {
    setEditingDeadlineId(null);
    setDeadlineTitle("");
    setDeadlineSubject("");
    setDeadlineDate("");
    setDeadlinePriority("medium");
    setDeadlineDescription("");
    setDeadlineError("");
    setShowDeadlineModal(true);
  }

  function openEditDeadline(deadline: Deadline) {
    setEditingDeadlineId(deadline.id);
    setDeadlineTitle(deadline.title);
    setDeadlineSubject(deadline.subject);
    setDeadlineDate(deadline.due_date);
    setDeadlinePriority(deadline.priority);
    setDeadlineDescription(deadline.description ?? "");
    setDeadlineError("");
    setShowDeadlineModal(true);
  }

  function closeDeadlineModal() {
    setShowDeadlineModal(false);
    setEditingDeadlineId(null);
    setDeadlineTitle("");
    setDeadlineSubject("");
    setDeadlineDate("");
    setDeadlinePriority("medium");
    setDeadlineDescription("");
  }

  async function saveDeadline() {
    const title = deadlineTitle.trim();
    const subject = deadlineSubject.trim();
    if (!title || !deadlineDate) {
      setDeadlineError(language === "id" ? "Judul dan tanggal tenggat wajib diisi." : "Deadline title and due date are required.");
      return;
    }

    try {
      setDeadlineError("");
      if (editingDeadlineId !== null) {
        await updateDeadline(editingDeadlineId, {
          title,
          subject: subject || "General",
          due_date: deadlineDate,
          priority: deadlinePriority,
          description: deadlineDescription.trim() || null,
        });
      } else {
        await createDeadline({
          title,
          subject: subject || "General",
          due_date: deadlineDate,
          priority: deadlinePriority,
          description: deadlineDescription.trim() || null,
        });
      }
      await refreshDeadlines();
      closeDeadlineModal();
    } catch (error) {
      console.error("Gagal menyimpan deadline:", error);
      setDeadlineError(language === "id" ? "Tenggat gagal disimpan. Periksa database dan coba lagi." : "Could not save deadline. Check the database and try again.");
    }
  }

  async function toggleDeadlineStatus(deadline: Deadline) {
    try {
      await updateDeadlineStatus(deadline.id, deadline.status !== "completed");
      await refreshDeadlines();
    } catch (error) {
      console.error("Gagal mengubah status deadline:", error);
      setDeadlineError(language === "id" ? "Status tenggat gagal diperbarui." : "Could not update deadline status.");
    }
  }

  async function removeDeadline(id: number) {
    const selected = deadlines.find((item) => item.id === id);
    if (!selected || !window.confirm(language === "id" ? `Hapus tenggat "${selected.title}"?` : `Delete deadline "${selected.title}"?`)) return;
    try {
      await deleteDeadline(id);
      await refreshDeadlines();
    } catch (error) {
      console.error("Gagal menghapus deadline:", error);
      setDeadlineError(language === "id" ? "Tenggat gagal dihapus." : "Could not delete deadline.");
    }
  }

  function toLocalDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const todayKey = toLocalDateKey(new Date());
  const upcomingDeadlines = deadlines
    .filter((deadline) => deadline.status === "pending" && deadline.due_date >= todayKey)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 3);
  const upcomingEvents = events
    .filter((event) => event.event_date >= todayKey)
    .sort((a, b) => `${a.event_date} ${a.start_time ?? ""}`.localeCompare(`${b.event_date} ${b.start_time ?? ""}`))
    .slice(0, 3);

  const completedTasks = tasks.filter((task) => task.completed).length;
  const progress =
    tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0;

  const today = new Date();

  const formattedDate = today.toLocaleDateString(appSettings.date_format, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  async function toggleTask(id: number) {
    const selectedTask = tasks.find((task) => task.id === id);
    if (!selectedTask) return;

    try {
      setTaskError("");
      await updateTaskStatus(id, !selectedTask.completed);
      await refreshTasks();
    } catch (error) {
      console.error("Gagal memperbarui status aktivitas:", error);
      setTaskError(language === "id" ? "Status aktivitas gagal diperbarui." : "Could not update activity status.");
    }
  }

  function openCreateTask() {
    setEditingTaskId(null);
    setNewTask("");
    setNewCategory("Personal");
    setNewPriority("medium");
    setTaskError("");
    setShowAddTask(true);
  }

  function openEditTask(task: Task) {
    setEditingTaskId(task.id);
    setNewTask(task.title);
    setNewCategory(task.category);
    setNewPriority(task.priority);
    setTaskError("");
    setShowAddTask(true);
  }

  function closeTaskModal() {
    setShowAddTask(false);
    setEditingTaskId(null);
    setNewTask("");
    setNewCategory("Personal");
    setNewPriority("medium");
  }

  async function addTask() {
    const title = newTask.trim();
    if (!title) return;

    try {
      setTaskError("");
      if (editingTaskId !== null) {
        await editTask(editingTaskId, title, newCategory, newPriority);
        console.log("Aktivitas berhasil diperbarui di SQLite.");
      } else {
        await saveTask(title, newCategory, newPriority);
        console.log("Aktivitas berhasil disimpan ke SQLite.");
      }

      await refreshTasks();
      closeTaskModal();
    } catch (error) {
      console.error("Gagal menyimpan aktivitas:", error);
      setTaskError(language === "id" ? "Aktivitas gagal disimpan. Silakan coba lagi." : "Could not save activity. Please try again.");
    }
  }

  async function deleteActivity(id: number) {
    const selectedTask = tasks.find((task) => task.id === id);
    if (!selectedTask) return;

    const confirmed = window.confirm(language === "id" ? `Hapus aktivitas "${selectedTask.title}"?` : `Delete activity "${selectedTask.title}"?`);
    if (!confirmed) return;

    try {
      setTaskError("");
      await removeTask(id);
      await refreshTasks();
      console.log("Aktivitas berhasil dihapus dari SQLite.");
    } catch (error) {
      console.error("Gagal menghapus aktivitas:", error);
      setTaskError(language === "id" ? "Aktivitas gagal dihapus." : "Could not delete activity.");
    }
  }

  const filteredTasks = tasks.filter((task) =>
    `${task.title} ${task.category}`.toLowerCase().includes(search.toLowerCase()),
  );

  const myDailyTasks = filteredTasks.filter((task) => {
    if (statusFilter === "active") return !task.completed;
    if (statusFilter === "completed") return task.completed;
    return true;
  });

  return (
    <main className={`app-shell ${isDark ? "dark" : "light"}`} data-language={language}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Command size={23} strokeWidth={2.3} />
          </div>
          <div>
            <h2>MyHub<span>.</span></h2>
            <p>{language === "id" ? "RUANG PRIBADI" : "YOUR PERSONAL SPACE"}</p>
          </div>
        </div>

        <div className="sidebar-profile">
          <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
          <div className="profile-info">
            <strong>{displayName}</strong>
            <span>{tx("Ruang Kerja Pribadi")}</span>
          </div>
          <MoreHorizontal size={19} />
        </div>

        <nav className="navigation">
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{tx(group.label)}</p>

              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.name}
                    className={`nav-item ${
                      activePage === item.name ? "active" : ""
                    }`}
                    onClick={() => setActivePage(item.name)}
                  >
                    <Icon size={18} />
                    <span>{tx(item.name)}</span>
                    {activePage === item.name && (
                      <span className="active-indicator" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => void toggleTheme()}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span>{isDark ? tx("Mode Terang") : tx("Mode Gelap")}</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Settings" ? "active" : ""
            }`}
            onClick={() => setActivePage("Settings")}
          >
            <Settings size={18} />
            <span>{tx("Pengaturan")}</span>
          </button>

          <div className="sidebar-footer">
            <div className="footer-status" />
            <span>MyHub v0.1.0</span>
            <span className="footer-online">{language === "id" ? "LOKAL" : "LOCAL"}</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{tx("Ruang Kerja")}</span>
            <ChevronRight size={15} />
            <strong>{tx(activePage)}</strong>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tx("Cari apa saja...")}
              />
              <kbd>⌘ K</kbd>
            </div>

            <button
              className="icon-button notification-button"
              aria-label={language === "id" ? "Notifikasi" : "Notifications"}
              title={language === "id" ? "Notifikasi" : "Notifications"}
            >
              <Bell size={19} />
              <span />
            </button>

            <div className="topbar-avatar">{displayName.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        {activePage === "Dashboard" ? (
          <div className="dashboard page-enter">
            {/* WELCOME */}
            <section className="welcome-section">
              <div>
                <div className="welcome-eyebrow">
                  <Sparkles size={15} />
                  <span>{tx("RUANG KERJA PRIBADI")}</span>
                </div>
                <h1>{language === "id" ? `Selamat datang, ${firstName}` : `Good day, ${firstName}`}<span>.</span></h1>
                <p>{tx("Inilah ringkasan aktivitas ruang kerjamu hari ini.")}</p>
                <div className="date-label">
                  <CalendarDays size={15} />
                  {formattedDate}
                </div>
              </div>

              <button
                className="primary-button"
                onClick={openCreateTask}
              >
                <Plus size={17} />
                {tx("Tugas Baru")}
              </button>
            </section>

            {/* STATISTICS */}
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <div className="stat-icon blue-bg">
                    <CheckSquare size={19} />
                  </div>
                  <span className="stat-caption">{tx("HARI INI")}</span>
                </div>
                <h2>{tasks.length.toString().padStart(2, "0")}</h2>
                <p>{tx("Total Aktivitas")}</p>
                <div className="stat-bottom">
                  <span className="positive">
                    <TrendingUp size={13} /> {completedTasks} {tx("selesai")}
                  </span>
                  <span>{tx("HARI INI")}</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <div className="stat-icon purple-bg">
                    <Clock3 size={19} />
                  </div>
                  <span className="stat-caption">{tx("MENDATANG")}</span>
                </div>
                <h2>{deadlines.filter((item) => item.status === "pending" && item.due_date >= todayKey).length.toString().padStart(2, "0")}</h2>
                <p>{tx("Tenggat Mendatang")}</p>
                <div className="stat-bottom">
                  <span className="warning-text">{upcomingDeadlines[0] ? tx("Berikutnya: {date}").replace("{date}", formatDeadlineDate(upcomingDeadlines[0].due_date)) : tx("Tidak ada agenda mendatang")}</span>
                  <span>{tx("Minggu ini")}</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <div className="stat-icon green-bg">
                    <Wallet size={19} />
                  </div>
                  <span className="stat-caption">{tx("SEMUA WAKTU")}</span>
                </div>
                <h2>{formatCompactCurrency(financeSummary.balance, appSettings.currency)}</h2>
                <p>{tx("Saldo Saat Ini")}</p>
                <div className="stat-bottom">
                  <span className="positive">
                    <TrendingUp size={13} /> {tx("Pemasukan {amount}").replace("{amount}", formatCompactCurrency(financeSummary.month_income, appSettings.currency))}
                  </span>
                  <span>{today.toLocaleDateString(appSettings.date_format, { month: "short" })}</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <div className="stat-icon orange-bg">
                    <GraduationCap size={19} />
                  </div>
                  <span className="stat-caption">{tx("ACADEMIC")}</span>
                </div>
                <h2>03</h2>
                <p>{tx("Kelas Hari Ini")}</p>
                <div className="stat-bottom">
                  <span className="positive">{tx("Jadwal tersedia")}</span>
                  <span>{tx("HARI INI")}</span>
                </div>
              </div>
            </section>

            {/* MAIN GRID */}
            <section className="content-grid">
              {/* DAILY ACTIVITIES */}
              <div className="panel activities-panel">
                <div className="panel-header">
                  <div>
                    <h3>{tx("Aktivitas Harian")}</h3>
                    <p>{tx("Pantau perkembangan aktivitas harianmu.")}</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setActivePage("MyDaily")}
                  >
                    {tx("Lihat semua")} <ChevronRight size={15} />
                  </button>
                </div>

                <div className="progress-section">
                  <div className="progress-info">
                    <span>{tx("Progres hari ini")}</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p>
                    {tx("{completed} dari {total} aktivitas selesai").replace("{completed}", String(completedTasks)).replace("{total}", String(tasks.length))}
                  </p>
                </div>

                <div className="task-list">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                      <div className="task-row" key={task.id}>
                        <button
                          className={`task-check ${
                            task.completed ? "checked" : ""
                          }`}
                          onClick={() => toggleTask(task.id)}
                          aria-label={`Toggle ${task.title}`}
                        >
                          {task.completed && <Check size={13} />}
                        </button>

                        <div className="task-info">
                          <strong
                            className={
                              task.completed ? "task-done" : ""
                            }
                          >
                            {task.title}
                          </strong>
                          <span>{tx(task.category)}</span>
                        </div>

                        <span className="task-time">{tx("Kapan saja")}</span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      {tx("Tidak ada aktivitas yang cocok.")}
                    </div>
                  )}
                </div>

                <button
                  className="add-task-button"
                  onClick={openCreateTask}
                >
                  <Plus size={16} /> {tx("Tambah aktivitas")}
                </button>
              </div>

              {/* DEADLINES */}
              <div className="panel deadlines-panel">
                <div className="panel-header">
                  <div>
                    <h3>{tx("Tenggat Mendatang")}</h3>
                    <p>{tx("Tetap ikuti jadwal dan tenggat tugasmu.")}</p>
                  </div>
                  <button
                    className="icon-button subtle-button"
                    onClick={() => setActivePage("Deadlines")}
                    aria-label={tx("Tenggat Mendatang")}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </div>

                <div className="deadline-list">
                  {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((deadline, index) => {
                    const dateParts = formatDeadlineDate(deadline.due_date).split(" ");
                    const colors = ["purple", "blue", "orange"];
                    return (
                      <div className="deadline-item" key={deadline.id}>
                        <div className={`deadline-date ${colors[index % colors.length]}`}>
                          <span>{dateParts[0]}</span>
                          <strong>{dateParts[1]}</strong>
                        </div>
                        <div className="deadline-info">
                          <strong>{deadline.title}</strong>
                          <span>{deadline.subject}</span>
                        </div>
                        <span className="deadline-days">{getDaysRemaining(deadline.due_date)}</span>
                      </div>
                    );
                  }) : <div className="empty-state">{tx("Tidak ada tenggat mendatang.")}</div>}
                </div>

                <button
                  className="panel-link"
                  onClick={() => setActivePage("Deadlines")}
                >
                  {tx("Lihat semua tenggat")} <ChevronRight size={15} />
                </button>
              </div>

              {/* UPCOMING EVENTS */}
              <div className="panel dashboard-events-panel">
                <div className="panel-header">
                  <div>
                    <h3>{tx("Semua Agenda Mendatang")}</h3>
                    <p>{tx("Agenda dan kegiatan dari kalendermu.")}</p>
                  </div>
                  <button
                    className="icon-button subtle-button"
                    onClick={() => setActivePage("Calendar")}
                    aria-label={tx("Buka kalender")}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </div>

                {eventError ? (
                  <div className="empty-state">{eventError}</div>
                ) : eventLoading ? (
                  <div className="empty-state">{tx("Memuat agenda kalender...")}</div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="dashboard-event-list">
                    {upcomingEvents.map((event) => (
                      <button
                        className="dashboard-event-row"
                        key={event.id}
                        onClick={() => setActivePage("Calendar")}
                      >
                        <div className="dashboard-event-date">
                          <span>{new Date(`${event.event_date}T00:00:00`).toLocaleDateString(appSettings.date_format, { month: "short" })}</span>
                          <strong>{new Date(`${event.event_date}T00:00:00`).getDate()}</strong>
                        </div>
                        <div className="dashboard-event-copy">
                          <strong>{event.title}</strong>
                          <span>{tx(event.category)}{event.start_time ? ` · ${event.start_time}` : ""}</span>
                        </div>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">{tx("Belum ada agenda. Tambahkan melalui Kalender.")}</div>
                )}

                <button className="panel-link" onClick={() => setActivePage("Calendar")}>
                  {tx("Buka kalender")} <ChevronRight size={15} />
                </button>
              </div>

              {/* CLASS SCHEDULE */}
              <div className="panel schedule-panel">
                <div className="panel-header">
                  <div>
                    <h3>{tx("Jadwal Kuliah")}</h3>
                    <p>{tx("Agenda akademikmu hari ini.")}</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setActivePage("Class Roster")}
                  >
                    {tx("Daftar kelas")} <ChevronRight size={15} />
                  </button>
                </div>

                <div className="schedule-list">
                  {schedule.map((item) => (
                    <div className="schedule-item" key={item.subject}>
                      <div className="schedule-time">
                        <strong>{item.time}</strong>
                        <span>{item.end}</span>
                      </div>
                      <div className={`schedule-line ${item.color}`} />
                      <div className="schedule-info">
                        <strong>{item.subject}</strong>
                        <span>{item.room.replace("Room", language === "id" ? "Ruang" : "Room")}</span>
                      </div>
                      <ChevronRight size={16} className="schedule-arrow" />
                    </div>
                  ))}
                </div>
              </div>

              {/* QUICK NOTES */}
              <div className="panel notes-panel">
                <div className="panel-header">
                  <div>
                    <h3>{tx("Catatan Cepat")}</h3>
                    <p>{tx("Simpan ide agar mudah ditemukan kembali.")}</p>
                  </div>
                  <button
                    className="icon-button subtle-button"
                    onClick={() => setActivePage("QuickVault")}
                    aria-label={tx("Buka QuickVault")}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </div>

                <div className="quick-note">
                  <div className="note-indicator" />
                  <div>
                    <strong>{tx("Pengembangan MyHub")}</strong>
                    <p>
                      {tx("Bangun dashboard utama sebelum mengintegrasikan SQLite dan modul lainnya.")}
                    </p>
                    <span>{tx("PROYEK PRIBADI · HARI INI")}</span>
                  </div>
                </div>

                <button
                  className="panel-link"
                  onClick={() => setActivePage("QuickVault")}
                >
                  {tx("Buka QuickVault")} <ChevronRight size={15} />
                </button>
              </div>
            </section>

            <footer className="dashboard-footer">
              <span>MYHUB © 2026</span>
              <span>{tx("Dibuat untuk ruang pribadimu.")}</span>
            </footer>
          </div>
        ) : activePage === "MyDaily" ? (
          <div className="mydaily-page page-enter">
            <section className="mydaily-heading">
              <div>
                <span className="welcome-eyebrow">{tx("PERENCANA HARIAN")}</span>
                <h1>MyDaily<span>.</span></h1>
                <p>{tx("Atur aktivitas harian, pantau progres, dan simpan semuanya secara lokal.")}</p>
              </div>
              <button className="primary-button" onClick={openCreateTask}>
                <Plus size={17} /> {tx("Aktivitas Baru")}
              </button>
            </section>

            <section className="mydaily-stats">
              <div className="mydaily-stat-card">
                <span>{tx("Total Aktivitas")}</span>
                <strong>{tasks.length.toString().padStart(2, "0")}</strong>
                <small>{tx("Semua aktivitas tersimpan")}</small>
              </div>
              <div className="mydaily-stat-card">
                <span>{tx("Sedang Berjalan")}</span>
                <strong>{(tasks.length - completedTasks).toString().padStart(2, "0")}</strong>
                <small>{tx("Belum diselesaikan")}</small>
              </div>
              <div className="mydaily-stat-card">
                <span>{tx("Selesai")}</span>
                <strong>{completedTasks.toString().padStart(2, "0")}</strong>
                <small>{tx("Aktivitas selesai")}</small>
              </div>
              <div className="mydaily-stat-card">
                <span>{tx("Tingkat Penyelesaian")}</span>
                <strong>{progress}%</strong>
                <small>{tx("Progres keseluruhan")}</small>
              </div>
            </section>

            <section className="panel mydaily-list-panel">
              <div className="mydaily-list-heading">
                <div>
                  <h3>{tx("Aktivitas Saya")}</h3>
                  <p>{tx("Data aktivitas dibaca langsung dari SQLite.")}</p>
                </div>
                <div className="mydaily-filter-group" role="group" aria-label={tx("Filter aktivitas")}>
                  <button className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>{tx("Semua")}</button>
                  <button className={statusFilter === "active" ? "active" : ""} onClick={() => setStatusFilter("active")}>{tx("Sedang Berjalan")}</button>
                  <button className={statusFilter === "completed" ? "active" : ""} onClick={() => setStatusFilter("completed")}>{tx("Selesai")}</button>
                </div>
              </div>

              {taskError && <p className="mydaily-error" role="alert">{taskError}</p>}

              {taskLoading ? (
                <div className="mydaily-empty">{tx("Memuat aktivitas dari SQLite...")}</div>
              ) : myDailyTasks.length > 0 ? (
                <div className="mydaily-task-list">
                  {myDailyTasks.map((task) => (
                    <article className="mydaily-task-row" key={task.id}>
                      <button
                        className={`mydaily-task-check ${task.completed ? "checked" : ""}`}
                        onClick={() => void toggleTask(task.id)}
                        aria-label={language === "id" ? (task.completed ? `Tandai ${task.title} belum selesai` : `Tandai ${task.title} selesai`) : (task.completed ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as completed`)}
                      >
                        {task.completed && <Check size={14} />}
                      </button>
                      <div className="mydaily-task-copy">
                        <strong className={task.completed ? "completed-title" : ""}>{task.title}</strong>
                        <div className="mydaily-task-meta">
                          <span>{tx(task.category)}</span>
                          <span className={`mydaily-priority priority-${task.priority}`}>{tx(task.priority === "low" ? "Rendah" : task.priority === "medium" ? "Sedang" : "Tinggi")}</span>
                          <span>{tx("Kapan saja")}</span>
                        </div>
                      </div>
                      <div className="mydaily-task-actions">
                        <button className="mydaily-action-button" onClick={() => openEditTask(task)} aria-label={`${language === "id" ? "Edit aktivitas" : "Edit activity"} ${task.title}`} title={language === "id" ? "Edit aktivitas" : "Edit activity"}>
                          <Pencil size={16} />
                        </button>
                        <button className="mydaily-action-button delete" onClick={() => void deleteActivity(task.id)} aria-label={`${language === "id" ? "Hapus aktivitas" : "Delete activity"} ${task.title}`} title={language === "id" ? "Hapus aktivitas" : "Delete activity"}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mydaily-empty">
                  <div className="mydaily-empty-icon"><CalendarDays size={25} /></div>
                  <strong>{tx(tasks.length === 0 ? "Belum ada aktivitas" : "Tidak ada aktivitas pada filter ini")}</strong>
                  <p>{tx(tasks.length === 0 ? "Tambahkan aktivitas pertamamu. Data akan disimpan ke database lokal MyHub." : "Coba pilih filter lain atau ubah kata kunci pencarian.")}</p>
                  {tasks.length === 0 && <button className="primary-button" onClick={openCreateTask}><Plus size={16} /> {tx("Tambah aktivitas pertama")}</button>}
                </div>
              )}
            </section>
          </div>
        ) : activePage === "Calendar" ? (
          <CalendarPage
            events={events}
            loading={eventLoading}
            error={eventError}
            onRefresh={refreshEvents}
            weekStartsOn={appSettings.week_start}
            dateFormat={appSettings.date_format}
            language={language}
          />
        ) : activePage === "SpendNote" ? (
          <SpendNotePage onDataChanged={refreshFinanceSummary} currency={appSettings.currency} dateFormat={appSettings.date_format} language={language} />
        ) : activePage === "Deadlines" ? (
          <div className="deadlines-page page-enter">
            <section className="deadlines-heading">
              <div>
                <span className="welcome-eyebrow">{tx("PENGELOLA TENGGAT")}</span>
                <h1>{tx("Tenggat")}<span>.</span></h1>
                <p>{tx("Kelola tugas, tanggal jatuh tempo, dan prioritas dalam satu tempat.")}</p>
              </div>
              <button className="primary-button" onClick={openCreateDeadline}>
                <Plus size={17} /> {tx("Tenggat Baru")}
              </button>
            </section>

            <section className="deadlines-stats">
              <div className="deadlines-stat-card"><span>{tx("Total Tenggat")}</span><strong>{deadlines.length.toString().padStart(2, "0")}</strong><small>{tx("Semua tenggat tersimpan")}</small></div>
              <div className="deadlines-stat-card"><span>{tx("Akan Datang")}</span><strong>{deadlines.filter((item) => item.status === "pending" && item.due_date >= todayKey).length.toString().padStart(2, "0")}</strong><small>{tx("Belum jatuh tempo")}</small></div>
              <div className="deadlines-stat-card"><span>{tx("Terlambat")}</span><strong>{deadlines.filter((item) => item.status === "pending" && item.due_date < todayKey).length.toString().padStart(2, "0")}</strong><small>{tx("Perlu ditindaklanjuti")}</small></div>
              <div className="deadlines-stat-card"><span>{tx("Selesai")}</span><strong>{deadlines.filter((item) => item.status === "completed").length.toString().padStart(2, "0")}</strong><small>{tx("Tenggat selesai")}</small></div>
            </section>

            <section className="panel deadlines-manager-panel">
              <div className="deadlines-manager-header">
                <div><h3>{tx("Daftar Tenggat Saya")}</h3><p>{tx("Data tenggat tersimpan secara lokal di SQLite.")}</p></div>
              </div>
              {deadlineError && <p className="deadline-error" role="alert">{deadlineError}</p>}
              {deadlineLoading ? <div className="deadline-empty">{tx("Memuat tenggat...")}</div> : deadlines.length > 0 ? (
                <div className="deadline-manager-list">
                  {[...deadlines].sort((a, b) => a.due_date.localeCompare(b.due_date)).map((deadline) => {
                    const overdue = deadline.status === "pending" && deadline.due_date < todayKey;
                    return (
                      <article className={`deadline-manager-row ${deadline.status === "completed" ? "is-completed" : ""}`} key={deadline.id}>
                        <button className={`deadline-status-check ${deadline.status === "completed" ? "checked" : ""}`} onClick={() => void toggleDeadlineStatus(deadline)} title={tx("Tandai selesai")} aria-label={tx("Tandai selesai")}>
                          {deadline.status === "completed" && <Check size={14} />}
                        </button>
                        <div className="deadline-manager-date"><CalendarClock size={17} /><span>{formatDeadlineDate(deadline.due_date)}</span></div>
                        <div className="deadline-manager-copy"><strong>{deadline.title}</strong><span>{tx(deadline.subject)}{deadline.description ? ` · ${deadline.description}` : ""}</span></div>
                        <span className={`deadline-priority priority-${deadline.priority}`}>{tx(deadline.priority === "low" ? "Rendah" : deadline.priority === "medium" ? "Sedang" : "Tinggi")}</span>
                        <span className={`deadline-status-label ${overdue ? "overdue" : deadline.status}`}>{deadline.status === "completed" ? tx("Selesai") : overdue ? tx("Terlambat") : getDaysRemaining(deadline.due_date)}</span>
                        <div className="deadline-manager-actions">
                          <button className="mydaily-action-button" onClick={() => openEditDeadline(deadline)} title={tx("Edit tenggat")} aria-label={tx("Edit tenggat")}><Pencil size={16} /></button>
                          <button className="mydaily-action-button delete" onClick={() => void removeDeadline(deadline.id)} title={tx("Hapus tenggat")} aria-label={tx("Hapus tenggat")}><Trash2 size={16} /></button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="deadline-empty"><div className="mydaily-empty-icon"><CalendarClock size={25} /></div><strong>{tx("Belum ada tenggat")}</strong><p>{tx("Tambahkan tenggat pertama agar jadwal tugasmu lebih teratur.")}</p><button className="primary-button" onClick={openCreateDeadline}><Plus size={16} /> {tx("Tambah tenggat pertama")}</button></div>
              )}
            </section>
          </div>
        ) : activePage === "QuickVault" ? (
          <QuickVaultPage language={language} />
        ) : activePage === "File Organizer" ? (
          <FileOrganizerPage language={language} dateFormat={appSettings.date_format} />
        ) : activePage === "Settings" ? (
          <SettingsPage settings={appSettings} onSave={persistUserSettings} />
        ) : (
          <div className="placeholder-page page-enter">
            <div className="placeholder-icon">
              {(() => {
                const item = navigation
                  .flatMap((group) => group.items)
                  .find((entry) => entry.name === activePage);

                const Icon = item?.icon ?? Settings;
                return <Icon size={32} />;
              })()}
            </div>
            <span className="welcome-eyebrow">{tx("Ruang kerja MyHub")}</span>
            <h1>{tx(activePage)}</h1>
            <p>
              {tx("Modul ini siap dikembangkan pada tahap berikutnya.")}
            </p>
            <button
              className="primary-button"
              onClick={() => setActivePage("Dashboard")}
            >
              <ChevronLeft size={17} />
              {tx("Kembali ke Beranda")}
            </button>
          </div>
        )}
      </section>

      {/* ADD TASK MODAL */}
      {showAddTask && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeTaskModal();
            }
          }}
        >
          <div className="task-modal">
            <div className="modal-header">
              <div>
                <span>MYDAILY</span>
                <h3>{editingTaskId !== null ? tx("Edit aktivitas") : tx("Buat aktivitas baru")}</h3>
              </div>
              <button
                className="icon-button"
                onClick={closeTaskModal}
                aria-label={tx("Tutup dialog")}
              >
                <X size={19} />
              </button>
            </div>

            <label htmlFor="new-task">{tx("Nama aktivitas")}</label>
            <input
              id="new-task"
              autoFocus
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addTask();
              }}
              placeholder={tx("Apa yang perlu kamu kerjakan?")}
            />

            {taskError && <p className="mydaily-error" role="alert">{taskError}</p>}

            <div className="mydaily-modal-fields">
              <div>
                <label htmlFor="task-category">{tx("Kategori")}</label>
                <select id="task-category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                  <option value="Personal">{tx("Pribadi")}</option>
                  <option value="University">{tx("Kuliah")}</option>
                  <option value="Assignment">{tx("Tugas")}</option>
                  <option value="Research">{tx("Riset")}</option>
                  <option value="Work">{tx("Kerja")}</option>
                  <option value="Other">{tx("Lainnya")}</option>
                </select>
              </div>
              <div>
                <label htmlFor="task-priority">{tx("Prioritas")}</label>
                <select id="task-priority" value={newPriority} onChange={(e) => setNewPriority(e.target.value as Task["priority"])}>
                  <option value="low">{tx("Rendah")}</option>
                  <option value="medium">{tx("Sedang")}</option>
                  <option value="high">{tx("Tinggi")}</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button className="cancel-button" onClick={closeTaskModal}>{tx("Batal")}</button>
              <button className="primary-button" onClick={() => void addTask()} disabled={!newTask.trim()}>
                <Plus size={16} /> {editingTaskId !== null ? tx("Simpan Perubahan") : tx("Buat Aktivitas")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeadlineModal && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDeadlineModal(); }}>
          <div className="task-modal deadline-modal">
            <div className="modal-header"><div><span>{tx("PENGELOLA TENGGAT")}</span><h3>{editingDeadlineId !== null ? tx("Edit tenggat") : tx("Buat tenggat baru")}</h3></div><button className="icon-button" onClick={closeDeadlineModal} aria-label={tx("Tutup dialog")}><X size={19} /></button></div>
            <label htmlFor="deadline-title">{tx("Judul tenggat")}</label>
            <input id="deadline-title" autoFocus value={deadlineTitle} onChange={(event) => setDeadlineTitle(event.target.value)} placeholder={language === "id" ? "Contoh: Tugas Basis Data" : "Example: Database Assignment"} />
            <div className="deadline-form-grid">
              <div><label htmlFor="deadline-subject">{tx("Mata kuliah / Kategori")}</label><input id="deadline-subject" value={deadlineSubject} onChange={(event) => setDeadlineSubject(event.target.value)} placeholder={language === "id" ? "Contoh: Sistem Basis Data" : "Example: Database Systems"} /></div>
              <div><label htmlFor="deadline-date">{tx("Tanggal tenggat")}</label><input id="deadline-date" type="date" value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} /></div>
              <div><label htmlFor="deadline-priority">{tx("Prioritas")}</label><select id="deadline-priority" value={deadlinePriority} onChange={(event) => setDeadlinePriority(event.target.value as Deadline["priority"])}><option value="low">{tx("Rendah")}</option><option value="medium">{tx("Sedang")}</option><option value="high">{tx("Tinggi")}</option></select></div>
            </div>
            <label htmlFor="deadline-description">{tx("Catatan (opsional)")}</label>
            <textarea id="deadline-description" value={deadlineDescription} onChange={(event) => setDeadlineDescription(event.target.value)} placeholder={tx("Detail tambahan...")} rows={3} />
            {deadlineError && <p className="deadline-error" role="alert">{deadlineError}</p>}
            <div className="modal-actions"><button className="cancel-button" onClick={closeDeadlineModal}>{tx("Batal")}</button><button className="primary-button" onClick={() => void saveDeadline()} disabled={!deadlineTitle.trim() || !deadlineDate}><Plus size={16} /> {editingDeadlineId !== null ? tx("Simpan Perubahan") : tx("Buat Tenggat")}</button></div>
          </div>
        </div>
      )}

    </main>
  );
}

export default App;
