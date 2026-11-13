import { getDatabase } from "./database";

export type TransactionType = "income" | "expense";

export interface SpendTransaction {
  id: number;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  transaction_date: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpendTransactionInput {
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  transaction_date: string;
  payment_method: string;
  notes: string | null;
}

export interface FinanceSummary {
  balance: number;
  month_income: number;
  month_expense: number;
}

export async function getTransactions(): Promise<SpendTransaction[]> {
  const db = await getDatabase();
  return db.select<SpendTransaction[]>(
    `SELECT * FROM transactions
     ORDER BY transaction_date DESC, id DESC`,
  );
}

export async function createTransaction(input: SpendTransactionInput): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO transactions
      (title, amount, type, category, transaction_date, payment_method, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [input.title, input.amount, input.type, input.category, input.transaction_date, input.payment_method, input.notes],
  );
}

export async function updateTransaction(id: number, input: SpendTransactionInput): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE transactions
     SET title = $1, amount = $2, type = $3, category = $4,
         transaction_date = $5, payment_method = $6, notes = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8`,
    [input.title, input.amount, input.type, input.category, input.transaction_date, input.payment_method, input.notes, id],
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM transactions WHERE id = $1", [id]);
}

export async function getFinanceSummary(monthKey: string): Promise<FinanceSummary> {
  const db = await getDatabase();
  const rows = await db.select<FinanceSummary[]>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS balance,
       COALESCE(SUM(CASE WHEN type = 'income' AND substr(transaction_date, 1, 7) = $1 THEN amount ELSE 0 END), 0) AS month_income,
       COALESCE(SUM(CASE WHEN type = 'expense' AND substr(transaction_date, 1, 7) = $1 THEN amount ELSE 0 END), 0) AS month_expense
     FROM transactions`,
    [monthKey],
  );
  return rows[0] ?? { balance: 0, month_income: 0, month_expense: 0 };
}
