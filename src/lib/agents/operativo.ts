import { BaseAgent } from "./base";
import type { AgentContext, AgentOutput } from "../core/schemas";

export class OperativoAgent extends BaseAgent {
  readonly id = "operativo" as const;
  readonly name = "Agente Operativo";
  readonly description = "Supervisa turnos, inventario, productividad y cumplimiento";

  async execute(context: AgentContext): Promise<AgentOutput> {
    const payload = context.payload ?? {};
    const lateArrivals = (payload.lateArrivals as number) ?? 0;
    const lowStockItems = (payload.lowStockItems as string[]) ?? [];
    const pendingTasks = (payload.pendingTasks as number) ?? 0;

    const alerts: AgentOutput["alerts"] = [];

    if (lateArrivals >= 3) {
      alerts.push({
        agentId: this.id,
        severity: "warning",
        message: `El colaborador presenta ${lateArrivals} llegadas tarde durante la semana`,
      });
    }

    for (const item of lowStockItems) {
      alerts.push({
        agentId: this.id,
        severity: "warning",
        message: `Inventario bajo: ${item}`,
      });
    }

    return {
      agentId: this.id,
      status: "success",
      summary: `Operaciones: ${lateArrivals} llegadas tarde, ${lowStockItems.length} items con stock bajo, ${pendingTasks} tareas pendientes`,
      data: { lateArrivals, lowStockItems, pendingTasks },
      alerts,
      events: [],
      confidence: 0.75,
      requiresApproval: false,
    };
  }
}
