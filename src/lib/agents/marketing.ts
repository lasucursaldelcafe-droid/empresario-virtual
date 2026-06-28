import { BaseAgent } from "./base";
import type { AgentContext, AgentOutput } from "../core/schemas";

export class MarketingAgent extends BaseAgent {
  readonly id = "marketing" as const;
  readonly name = "Agente de Marketing";
  readonly description = "Analiza redes sociales, campañas y propone contenido";

  async execute(context: AgentContext): Promise<AgentOutput> {
    const payload = context.payload ?? {};
    const hasSocialData = Boolean(payload.socialMetrics);

    if (!hasSocialData) {
      return {
        agentId: this.id,
        status: "partial",
        summary: "Sin datos de redes sociales conectados. Conecta Instagram/Facebook en integraciones.",
        data: { connected: false },
        alerts: [],
        events: [],
        confidence: 0.5,
        requiresApproval: false,
      };
    }

    const metrics = payload.socialMetrics as Record<string, number>;
    return {
      agentId: this.id,
      status: "success",
      summary: `Alcance semanal: ${metrics.reach ?? 0}. Engagement: ${metrics.engagement ?? 0}%`,
      data: { metrics, recommendations: ["Publicar contenido los martes y jueves", "Promover producto estrella del mes"] },
      alerts: [],
      events: [],
      confidence: 0.7,
      requiresApproval: false,
    };
  }
}
