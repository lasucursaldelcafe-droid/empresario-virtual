import { BaseAgent } from "./base";
import type { AgentContext, AgentOutput } from "../core/schemas";

export class JuridicoAgent extends BaseAgent {
  readonly id = "juridico" as const;
  readonly name = "Agente Jurídico";
  readonly description = "Controla vencimientos legales, contratos y obligaciones laborales";

  async execute(context: AgentContext): Promise<AgentOutput> {
    const upcoming = await this.memory.getUpcomingLegalObligations(30);
    const alerts: AgentOutput["alerts"] = [];

    for (const obligation of upcoming) {
      const daysUntil = Math.ceil(
        (new Date(obligation.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      const severity = daysUntil <= 7 ? ("critical" as const) : ("warning" as const);

      alerts.push({
        agentId: this.id,
        severity,
        message: `${obligation.title} vence en ${daysUntil} días (${obligation.dueDate})`,
      });
    }

    return {
      agentId: this.id,
      status: "success",
      summary: `${upcoming.length} obligaciones legales en los próximos 30 días`,
      data: { obligations: upcoming },
      alerts,
      events: upcoming.map((o) => ({
        type: "LEGAL_DEADLINE",
        payload: { obligation: o.title, dueDate: o.dueDate },
      })),
      confidence: 0.9,
      requiresApproval: upcoming.some(
        (o) =>
          Math.ceil(
            (new Date(o.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          ) <= 7,
      ),
    };
  }
}
