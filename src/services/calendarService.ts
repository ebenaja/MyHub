import { getDatabase } from "./database";

export interface CalendarEvent {
  id: number;
  title: string;
  category: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventInput {
  title: string;
  category: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
}

export async function getEvents(): Promise<CalendarEvent[]> {
  const db = await getDatabase();
  return db.select<CalendarEvent[]>(
    `SELECT * FROM events ORDER BY event_date ASC, start_time ASC, id DESC`,
  );
}

export async function createEvent(input: CalendarEventInput): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO events
      (title, category, event_date, start_time, end_time, location, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [input.title, input.category, input.event_date, input.start_time, input.end_time, input.location, input.description],
  );
}

export async function updateEvent(id: number, input: CalendarEventInput): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE events
     SET title = $1, category = $2, event_date = $3, start_time = $4,
         end_time = $5, location = $6, description = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8`,
    [input.title, input.category, input.event_date, input.start_time, input.end_time, input.location, input.description, id],
  );
}

export async function deleteEvent(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM events WHERE id = $1", [id]);
}
