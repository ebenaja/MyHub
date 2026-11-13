import { getDatabase } from "./database";

export interface Deadline {
  id: number;
  title: string;
  subject: string;
  due_date: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed";
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeadlineInput {
  title: string;
  subject: string;
  due_date: string;
  priority: Deadline["priority"];
  description: string | null;
}

export async function getDeadlines(): Promise<Deadline[]> {
  const db = await getDatabase();
  return db.select<Deadline[]>(
    "SELECT * FROM deadlines ORDER BY due_date ASC, id DESC",
  );
}

export async function createDeadline(input: DeadlineInput): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO deadlines (title, subject, due_date, priority, description)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.title, input.subject, input.due_date, input.priority, input.description],
  );
}

export async function updateDeadline(id: number, input: DeadlineInput): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE deadlines
     SET title = $1, subject = $2, due_date = $3, priority = $4,
         description = $5, updated_at = CURRENT_TIMESTAMP
     WHERE id = $6`,
    [input.title, input.subject, input.due_date, input.priority, input.description, id],
  );
}

export async function updateDeadlineStatus(id: number, completed: boolean): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE deadlines SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [completed ? "completed" : "pending", id],
  );
}

export async function deleteDeadline(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM deadlines WHERE id = $1", [id]);
}
