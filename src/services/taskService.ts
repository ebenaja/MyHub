import { getDatabase } from "./database";

export interface Task {
  id: number;
  title: string;
  category: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  completed: number;
  created_at: string;
  updated_at: string;
}

export async function getTasks(): Promise<Task[]> {
  const db = await getDatabase();

  return db.select<Task[]>(
    "SELECT * FROM tasks ORDER BY created_at DESC, id DESC",
  );
}

export async function createTask(
  title: string,
  category: string = "Personal",
  priority: Task["priority"] = "medium",
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    "INSERT INTO tasks (title, category, priority) VALUES ($1, $2, $3)",
    [title, category, priority],
  );
}

export async function updateTaskStatus(
  id: number,
  completed: boolean,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `UPDATE tasks
     SET completed = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [completed ? 1 : 0, id],
  );
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDatabase();

  await db.execute("DELETE FROM tasks WHERE id = $1", [id]);
}

export async function updateTask(
  id: number,
  title: string,
  category: string,
  priority: Task["priority"],
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `UPDATE tasks
     SET title = $1,
         category = $2,
         priority = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [title, category, priority, id],
  );
}
