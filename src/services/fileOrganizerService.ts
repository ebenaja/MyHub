import { getDatabase } from "./database";

export interface OrganizedFile {
  id: number;
  file_name: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  notes: string | null;
  added_at: string;
}

export interface OrganizedFileInput {
  file_name: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  notes: string | null;
}

export async function getOrganizedFiles(): Promise<OrganizedFile[]> {
  const db = await getDatabase();
  return db.select<OrganizedFile[]>(
    "SELECT * FROM organized_files ORDER BY added_at DESC, id DESC",
  );
}

export async function addOrganizedFile(input: OrganizedFileInput): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO organized_files (file_name, extension, mime_type, size_bytes, category, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.file_name, input.extension, input.mime_type, input.size_bytes, input.category, input.notes],
  );
}

export async function updateOrganizedFileCategory(id: number, category: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("UPDATE organized_files SET category = $1 WHERE id = $2", [category, id]);
}

export async function updateOrganizedFileNotes(id: number, notes: string | null): Promise<void> {
  const db = await getDatabase();
  await db.execute("UPDATE organized_files SET notes = $1 WHERE id = $2", [notes, id]);
}

export async function deleteOrganizedFile(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM organized_files WHERE id = $1", [id]);
}
