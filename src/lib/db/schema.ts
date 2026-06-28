import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  filename: text("filename").notNull(),
  type: text("type"), // invoice, receipt, contract, other
  category: text("category"),
  amount: real("amount"),
  vendor: text("vendor"),
  dueDate: text("due_date"),
  status: text("status").default("pending"),
  source: text("source").default("upload"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  type: text("type").notNull(), // income | expense
  amount: real("amount").notNull(),
  category: text("category"),
  description: text("description"),
  documentId: text("document_id"),
  date: text("date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const kpis = sqliteTable("kpis", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  period: text("period").notNull(), // daily | weekly | monthly
  date: text("date").notNull(),
  sales: real("sales").default(0),
  expenses: real("expenses").default(0),
  profit: real("profit").default(0),
  cashFlow: real("cash_flow").default(0),
  metadata: text("metadata"), // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  agentId: text("agent_id").notNull(),
  severity: text("severity").notNull(), // info | warning | critical
  message: text("message").notNull(),
  resolved: integer("resolved", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  lastPurchaseDate: text("last_purchase_date"),
  totalPurchases: real("total_purchases").default(0),
  status: text("status").default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const legalObligations = sqliteTable("legal_obligations", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  agentId: text("agent_id").notNull(),
  phase: text("phase"),
  status: text("status").notNull(),
  input: text("input"),
  output: text("output"),
  durationMs: integer("duration_ms"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const oauthTokens = sqliteTable("oauth_tokens", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  provider: text("provider").notNull(), // google
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  email: text("email"),
  scopes: text("scopes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  type: text("type").notNull(), // daily | weekly | monthly
  date: text("date").notNull(),
  content: text("content").notNull(),
  sentToEmail: integer("sent_to_email", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
