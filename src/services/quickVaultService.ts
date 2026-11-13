import { getDatabase } from "./database";

export type QuickVaultKind = "note" | "link" | "idea" | "snippet";

export interface QuickVaultItem {
  id: number;
  title: string;
  kind: QuickVaultKind;
  category: string;
  content: string;
  url: string | null;
  tags: string | null;
  is_pinned: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface QuickVaultInput {
  title: string;
  kind: QuickVaultKind;
  category: string;
  content: string;
  url: string | null;
  tags: string | null;
}

export async function getQuickVaultItems(): Promise<QuickVaultItem[]> {
  const db = await getDatabase();
  return db.select<QuickVaultItem[]>(
    `SELECT * FROM quickvault_items
     ORDER BY is_pinned DESC, updated_at DESC, id DESC`,
  );
}

export async function createQuickVaultItem(input: QuickVaultInput): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO quickvault_items (title, kind, category, content, url, tags)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.title, input.kind, input.category, input.content, input.url, input.tags],
  );
}

export async function updateQuickVaultItem(id: number, input: QuickVaultInput): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE quickvault_items
     SET title = $1, kind = $2, category = $3, content = $4, url = $5,
         tags = $6, updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [input.title, input.kind, input.category, input.content, input.url, input.tags, id],
  );
}

export async function setQuickVaultPinned(id: number, pinned: boolean): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    "UPDATE quickvault_items SET is_pinned = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [pinned ? 1 : 0, id],
  );
}

export async function setQuickVaultArchived(id: number, archived: boolean): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    "UPDATE quickvault_items SET is_archived = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [archived ? 1 : 0, id],
  );
}

export async function deleteQuickVaultItem(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM quickvault_items WHERE id = $1", [id]);
}
