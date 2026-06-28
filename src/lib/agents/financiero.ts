import { BaseAgent } from "./base";
import type { AgentContext, AgentOutput } from "../core/schemas";

export class FinancieroAgent extends BaseAgent {
  readonly id = "financiero" as const;
  readonly name = "Agente Financiero";
  readonly description = "Analiza flujo de caja, rentabilidad y KPIs financieros";

  async execute(context: AgentContext): Promise<AgentOutput> {
    const date = context.date ?? new Date().toISOString().slice(0, 10);
    const transactions = await this.memory.getTodayTransactions(date);

    const sales = transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    const profit = sales - expenses;
    const cashFlow = profit;

    await this.memory.saveKpi({
      period: "daily",
      date,
      sales,
      expenses,
      profit,
      cashFlow,
    });

    const previous = await this.memory.getPreviousKpi("daily", date);
    let profitChangePercent: number | undefined;
    const alerts: AgentOutput["alerts"] = [];

    if (previous && previous.profit !== 0) {
      profitChangePercent =
        ((profit - (previous.profit ?? 0)) / Math.abs(previous.profit ?? 1)) * 100;

      if (profitChangePercent < -10) {
        alerts.push({
          agentId: this.id,
          severity: "warning",
          message: `Las utilidades disminuyeron ${Math.abs(profitChangePercent).toFixed(1)}% respecto al periodo anterior`,
        });
      }
    }

    if (profit < 0) {
      alerts.push({
        agentId: this.id,
        severity: "critical",
        message: `Pérdida operativa del día: $${Math.abs(profit).toLocaleString()}`,
      });
    }

    return {
      agentId: this.id,
      status: "success",
      summary: `Ventas: $${sales.toLocaleString()} | Gastos: $${expenses.toLocaleString()} | Utilidad: $${profit.toLocaleString()}`,
      data: { sales, expenses, profit, cashFlow, profitChangePercent, transactionCount: transactions.length },
      alerts,
      events: [
        {
          type: "KPI_UPDATED",
          payload: { sales, expenses, profit, date },
        },
      ],
      confidence: transactions.length > 0 ? 0.9 : 0.6,
      requiresApproval: profit < 0,
    };
  }
}
