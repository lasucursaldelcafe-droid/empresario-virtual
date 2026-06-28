import { BaseAgent } from "./base";
import type { AgentContext, AgentOutput } from "../core/schemas";

export class ComercialAgent extends BaseAgent {
  readonly id = "comercial" as const;
  readonly name = "Agente Comercial";
  readonly description = "CRM, seguimiento de clientes y oportunidades de venta";

  async execute(_: AgentContext): Promise<AgentOutput> {
    const inactiveClients = await this.memory.getClients(45);
    const alerts: AgentOutput["alerts"] = [];

    for (const client of inactiveClients.slice(0, 5)) {
      const days = client.lastPurchaseDate
        ? Math.floor(
            (Date.now() - new Date(client.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24),
          )
        : 999;

      alerts.push({
        agentId: this.id,
        severity: "info",
        message: `Hace ${days} días que ${client.name} no compra`,
      });
    }

    return {
      agentId: this.id,
      status: "success",
      summary: `${inactiveClients.length} clientes inactivos (+45 días). ${alerts.length} requieren seguimiento.`,
      data: {
        inactiveCount: inactiveClients.length,
        topInactive: inactiveClients.slice(0, 5).map((c) => ({
          id: c.id,
          name: c.name,
          lastPurchase: c.lastPurchaseDate,
        })),
      },
      alerts,
      events: inactiveClients.map((c) => ({
        type: "CLIENT_INACTIVE",
        payload: { clientId: c.id, name: c.name },
      })),
      confidence: 0.85,
      requiresApproval: false,
    };
  }
}
