import { getDatabase } from "./database";

export type AppSettings = {
  display_name: string;
  language: "id" | "en";
  theme: "dark" | "light";
  currency: "IDR" | "USD" | "SGD";
  date_format: "id-ID" | "en-US";
  week_start: "monday" | "sunday";
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  display_name: "Eben Manurung",
  language: "id",
  theme: "dark",
  currency: "IDR",
  date_format: "id-ID",
  week_start: "monday",
};

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ setting_key: string; setting_value: string }>>(
    "SELECT setting_key, setting_value FROM app_settings",
  );
  const values = new Map<string, string>(rows.map((row): [string, string] => [row.setting_key, row.setting_value]));
  return {
    display_name: values.get("display_name") || DEFAULT_APP_SETTINGS.display_name,
    language: values.get("language") === "en" ? "en" : "id",
    theme: values.get("theme") === "light" ? "light" : "dark",
    currency: values.get("currency") === "USD" || values.get("currency") === "SGD" ? values.get("currency") as AppSettings["currency"] : "IDR",
    date_format: values.get("language") === "en" ? "en-US" : "id-ID",
    week_start: values.get("week_start") === "sunday" ? "sunday" : "monday",
  };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDatabase();
  const entries = Object.entries(settings) as Array<[keyof AppSettings, string]>;
  for (const [key, value] of entries) {
    await db.execute(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES ($1, $2)
       ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value`,
      [key, value],
    );
  }
}
