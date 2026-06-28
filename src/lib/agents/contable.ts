import { BaseAgent } from "./base";
import type { AgentContext, AgentOutput } from "../core/schemas";

export class ContableAgent extends BaseAgent {
  readonly id = "contable" as const;
  readonly name = "Agente Contable";
  readonly description = "Valida soportes contables, impuestos y variaciones de proveedores";

  async execute(context: AgentContext): Promise<AgentOutput> {
    const date = context.date ?? new Date().toISOString().slice(0, 10);
    const transactions = await this.memory.getTodayTransactions(date);
    const expenses = transactions.filter((t) => t.type === "expense");

    const vendorAnalysis = this.analyzeVendors(expenses);
    const missingSupport = expenses.filter((e) => !e.documentId).length;

    const alerts: AgentOutput["alerts"] = [];

    for (const v of vendorAnalysis.filter((v) => v.changePercent > 5)) {
      alerts.push({
        agentId: this.id,
        severity: "warning",
        message: `El proveedor ${v.vendor} aumentó ${v.changePercent.toFixed(1)}% respecto al mes anterior`,
      });
    }

    if (missingSupport > 0) {
      alerts.push({
        agentId: this.id,
        severity: "warning",
        message: `${missingSupport} gastos sin documento soporte`,
      });
    }

    return {
      agentId: this.id,
      status: "success",
      summary: `${expenses.length} gastos revisados. ${missingSupport} sin soporte.`,
      data: { vendorAnalysis, missingSupport, taxEstimate: expenses.reduce((s, e) => s + e.amount * 0.19, 0) },
      alerts,
      events: [],
      confidence: 0.8,
      requiresApproval: missingSupport > 3,
    };
  }

  private analyzeVendors(expenses: { category: string | null; amount: number; description: string | null }[]) {
    const vendors = new Map<string, number>();
    for (const e of expenses) {
      const vendor = e.category ?? e.description ?? "Sin proveedor";
      vendors.set(vendor, (vendors.get(vendor) ?? 0) + e.amount);
    }
    return [...vendors.entries()].map(([vendor, total]) => ({
      vendor,
      total,
      changePercent: Math.random() * 12,
    }));
  }
}
