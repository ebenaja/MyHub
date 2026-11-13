
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        // MIGRATION 1: MyDaily
        Migration {
            version: 1,
            description: "create_initial_myhub_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'Personal',
                    description TEXT,
                    due_date TEXT,
                    priority TEXT NOT NULL DEFAULT 'medium',
                    completed INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_tasks_due_date
                ON tasks(due_date);

                CREATE INDEX IF NOT EXISTS idx_tasks_completed
                ON tasks(completed);
            "#,
            kind: MigrationKind::Up,
        },

        // MIGRATION 2: Deadlines
        Migration {
            version: 2,
            description: "create_deadlines_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS deadlines (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    subject TEXT NOT NULL DEFAULT 'General',
                    due_date TEXT NOT NULL,
                    priority TEXT NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('low', 'medium', 'high')),
                    status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed')),
                    description TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_deadlines_due_date
                ON deadlines(due_date);

                CREATE INDEX IF NOT EXISTS idx_deadlines_status
                ON deadlines(status);
            "#,
            kind: MigrationKind::Up,
        },

        // MIGRATION 3: Calendar Events
        Migration {
            version: 3,
            description: "create_calendar_events_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'Personal',
                    event_date TEXT NOT NULL,
                    start_time TEXT,
                    end_time TEXT,
                    location TEXT,
                    description TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_events_date
                ON events(event_date);

                CREATE INDEX IF NOT EXISTS idx_events_category
                ON events(category);
            "#,
            kind: MigrationKind::Up,
        },

        Migration {
            version: 4,
            description: "create_spendnote_transactions_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    amount REAL NOT NULL CHECK (amount > 0),
                    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                    category TEXT NOT NULL DEFAULT 'Other',
                    transaction_date TEXT NOT NULL,
                    payment_method TEXT NOT NULL DEFAULT 'Cash',
                    notes TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_transactions_date
                ON transactions(transaction_date);

                CREATE INDEX IF NOT EXISTS idx_transactions_type
                ON transactions(type);

                CREATE INDEX IF NOT EXISTS idx_transactions_category
                ON transactions(category);
            "#,
            kind: MigrationKind::Up,
        },
                Migration {
            version: 5,
            description: "create_quickvault_items_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS quickvault_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    kind TEXT NOT NULL DEFAULT 'note'
                        CHECK (kind IN ('note', 'link', 'idea', 'snippet')),
                    category TEXT NOT NULL DEFAULT 'Personal',
                    content TEXT NOT NULL,
                    url TEXT,
                    tags TEXT,
                    is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
                    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_quickvault_kind ON quickvault_items(kind);
                CREATE INDEX IF NOT EXISTS idx_quickvault_pinned ON quickvault_items(is_pinned);
                CREATE INDEX IF NOT EXISTS idx_quickvault_archived ON quickvault_items(is_archived);
            "#,
            kind: MigrationKind::Up,
        },
        
        Migration {
            version: 6,
            description: "create_organized_files_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS organized_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_name TEXT NOT NULL,
                    extension TEXT NOT NULL DEFAULT '',
                    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
                    size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
                    category TEXT NOT NULL DEFAULT 'Unsorted',
                    notes TEXT,
                    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_organized_files_category ON organized_files(category);
                CREATE INDEX IF NOT EXISTS idx_organized_files_name ON organized_files(file_name);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_app_settings_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS app_settings (
                    setting_key TEXT PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:myhub.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
