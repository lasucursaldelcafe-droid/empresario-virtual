import { eq, and, desc, gte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db, schema } from "../db";
import type { Alert } from "./schemas";

/**
 * Memoria compartida de la empresa — capa unificada de estado.
 * Todos los agentes leen/escriben aquí; nunca comparten contexto directamente.
 */
export class CompanyMemory {
  constructor(private companyId: string) {}

  async getTodayTransactions(date: string) {
    return db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.companyId, this.companyId),
          eq(schema.transactions.date, date),
        ),
      );
  }

  async getPendingDocuments() {
    return db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.companyId, this.companyId),
          eq(schema.documents.status, "pending"),
        ),
      );
  }

  async getActiveAlerts(limit = 20) {
    return db
      .select()
      .from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.companyId, this.companyId),
          eq(schema.alerts.resolved, false),
        ),
      )
      .orderBy(desc(schema.alerts.createdAt))
      .limit(limit);
  }

  async getClients(daysSincePurchase?: number) {
    const clients = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.companyId, this.companyId));

    if (!daysSincePurchase) return clients;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysSincePurchase);

    return clients.filter((c) => {
      if (!c.lastPurchaseDate) return true;
      return new Date(c.lastPurchaseDate) < cutoff;
    });
  }

  async getUpcomingLegalObligations(withinDays = 30) {
    const obligations = await db
      .select()
      .from(schema.legalObligations)
      .where(
        and(
          eq(schema.legalObligations.companyId, this.companyId),
          eq(schema.legalObligations.status, "pending"),
        ),
      );

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    return obligations.filter((o) => new Date(o.dueDate) <= cutoff);
  }

  async saveKpi(data: {
    period: string;
    date: string;
    sales: number;
    expenses: number;
    profit: number;
    cashFlow: number;
    metadata?: Record<string, unknown>;
  }) {
    await db.insert(schema.kpis).values({
      id: uuidv4(),
      companyId: this.companyId,
      period: data.period,
      date: data.date,
      sales: data.sales,
      expenses: data.expenses,
      profit: data.profit,
      cashFlow: data.cashFlow,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      createdAt: new Date(),
    });
  }

  async getPreviousKpi(period: string, beforeDate: string) {
    const rows = await db
      .select()
      .from(schema.kpis)
      .where(
        and(
          eq(schema.kpis.companyId, this.companyId),
          eq(schema.kpis.period, period),
        ),
      )
      .orderBy(desc(schema.kpis.date))
      .limit(5);

    return rows.find((r) => r.date < beforeDate) ?? null;
  }

  async saveAlert(alert: Alert) {
    await db.insert(schema.alerts).values({
      id: uuidv4(),
      companyId: this.companyId,
      agentId: alert.agentId,
      severity: alert.severity,
      message: alert.message,
      resolved: false,
      createdAt: new Date(),
    });
  }

  async saveReport(type: string, date: string, content: string) {
    await db.insert(schema.reports).values({
      id: uuidv4(),
      companyId: this.companyId,
      type,
      date,
      content,
      sentToEmail: false,
      createdAt: new Date(),
    });
  }

  async logAgentRun(
    agentId: string,
    phase: string,
    status: string,
    input: unknown,
    output: unknown,
    durationMs: number,
  ) {
    await db.insert(schema.agentRuns).values({
      id: uuidv4(),
      companyId: this.companyId,
      agentId,
      phase,
      status,
      input: JSON.stringify(input),
      output: JSON.stringify(output),
      durationMs,
      createdAt: new Date(),
    });
  }
}
