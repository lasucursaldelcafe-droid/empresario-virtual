import { createClient, type Client } from "@libsql/client";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzleSqlite<typeof schema>>;

let dbInstance: DbInstance | null = null;
let sqliteRaw: Database.Database | null = null;
let libsqlClient: Client | null = null;

function useTurso(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

function getDb(): DbInstance {
  if (dbInstance) return dbInstance;

  if (useTurso()) {
    libsqlClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    dbInstance = drizzleLibsql(libsqlClient, { schema }) as unknown as DbInstance;
  } else {
    const dbPath =
      process.env.DATABASE_URL?.startsWith("file:")
        ? process.env.DATABASE_URL.replace("file:", "")
        : process.env.DATABASE_URL ??
          path.join(process.cwd(), "data", "empresario.db");

    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    sqliteRaw = new Database(dbPath);
    sqliteRaw.pragma("journal_mode = WAL");
    dbInstance = drizzleSqlite(sqliteRaw, { schema });
  }

  return dbInstance;
}

export const db = new Proxy({} as DbInstance, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export { schema };

const INIT_SQL = `
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      type TEXT,
      category TEXT,
      amount REAL,
      vendor TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'pending',
      source TEXT DEFAULT 'upload',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      description TEXT,
      document_id TEXT,
      date TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kpis (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      period TEXT NOT NULL,
      date TEXT NOT NULL,
      sales REAL DEFAULT 0,
      expenses REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      cash_flow REAL DEFAULT 0,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      resolved INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      last_purchase_date TEXT,
      total_purchases REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS legal_obligations (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      phase TEXT,
      status TEXT NOT NULL,
      input TEXT,
      output TEXT,
      duration_ms INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      encrypted_refresh_token TEXT NOT NULL,
      email TEXT,
      scopes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      sent_to_email INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `;

export async function initDatabase() {
  getDb();

  if (useTurso() && libsqlClient) {
    await libsqlClient.executeMultiple(INIT_SQL);
  } else if (sqliteRaw) {
    sqliteRaw.exec(INIT_SQL);
  }
}
