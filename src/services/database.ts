
import Database from "@tauri-apps/plugin-sql";

let databasePromise: Promise<Database> | null = null;

export function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = Database.load("sqlite:myhub.db").catch((error) => {
      databasePromise = null;
      console.error("Gagal menghubungkan SQLite:", error);
      throw error;
    });
  }

  return databasePromise;
}

export async function initializeDatabase(): Promise<void> {
  await getDatabase();
  console.log("MyHub SQLite database initialized");
}
