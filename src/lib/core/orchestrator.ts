import type { AgentContext, AgentOutput, DailyCloseResult } from "./schemas";
import { DailyCloseResultSchema } from "./schemas";
import { createAgent, DAILY_CLOSE_SEQUENCE, SPECIALIST_AGENTS } from "../agents";
import { globalEventBus } from "./bus";

/**
 * Orquestador central — ejecuta secuencias deterministas de agentes.
 * Patrón Foreman: routing explícito, no negociación entre agentes.
 */
export class Orchestrator {
  constructor(private companyId: string) {}

  async runDailyClose(date?: string): Promise<DailyCloseResult> {
    const closeDate = date ?? new Date().toISOString().slice(0, 10);
    const results: AgentOutput[] = [];

    globalEventBus.publish({
      type: "DAILY_CLOSE_REQUESTED",
      payload: { date: closeDate, companyId: this.companyId },
    });

    for (const agentId of SPECIALIST_AGENTS) {
      const agent = createAgent(agentId, this.companyId);
      const context: AgentContext = {
        companyId: this.companyId,
        phase: `daily-${agentId}`,
        date: closeDate,
        payload: this.getDefaultPayload(agentId),
      };
      const output = await agent.run(context);
      results.push(output);
    }

    const gerencial = createAgent("gerencial", this.companyId);
    const gerencialOutput = await gerencial.run({
      companyId: this.companyId,
      phase: "daily-synthesize",
      date: closeDate,
      inputs: results,
    });
    results.push(gerencialOutput);

    const financiero = results.find((r) => r.agentId === "financiero");
    const kpiData = financiero?.data as Record<string, number> | undefined;

    const result: DailyCloseResult = {
      date: closeDate,
      agentResults: results,
      executiveSummary: (gerencialOutput.data.executiveSummary as string) ?? gerencialOutput.summary,
      topAlerts: results.flatMap((r) => r.alerts).filter((a) => a.severity !== "info").slice(0, 10),
      kpis: {
        sales: kpiData?.sales ?? 0,
        expenses: kpiData?.expenses ?? 0,
        profit: kpiData?.profit ?? 0,
        profitChangePercent: kpiData?.profitChangePercent,
      },
    };

    return DailyCloseResultSchema.parse(result);
  }

  async runAgent(agentId: typeof DAILY_CLOSE_SEQUENCE[number], phase: string, payload?: Record<string, unknown>) {
    const agent = createAgent(agentId, this.companyId);
    return agent.run({
      companyId: this.companyId,
      phase,
      payload,
    });
  }

  private getDefaultPayload(agentId: string): Record<string, unknown> {
    if (agentId === "operativo") {
      return { lateArrivals: 0, lowStockItems: [], pendingTasks: 0 };
    }
    return {};
  }
}
