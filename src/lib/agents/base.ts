import type { AgentContext, AgentId, AgentOutput } from "../core/schemas";
import { AgentOutputSchema } from "../core/schemas";
import { CompanyMemory } from "../core/memory";
import { globalEventBus } from "../core/bus";

export abstract class BaseAgent {
  abstract readonly id: AgentId;
  abstract readonly name: string;
  abstract readonly description: string;

  protected memory: CompanyMemory;

  constructor(companyId: string) {
    this.memory = new CompanyMemory(companyId);
  }

  abstract execute(context: AgentContext): Promise<AgentOutput>;

  async run(context: AgentContext): Promise<AgentOutput> {
    const start = Date.now();
    try {
      const output = await this.execute(context);
      const validated = AgentOutputSchema.parse(output);

      for (const alert of validated.alerts) {
        await this.memory.saveAlert(alert);
      }

      for (const event of validated.events) {
        await globalEventBus.publish(event);
      }

      await this.memory.logAgentRun(
        this.id,
        context.phase,
        validated.status,
        context,
        validated,
        Date.now() - start,
      );

      return validated;
    } catch (error) {
      const errorOutput: AgentOutput = {
        agentId: this.id,
        status: "error",
        summary: `Error en ${this.name}: ${error instanceof Error ? error.message : "desconocido"}`,
        data: {},
        alerts: [
          {
            agentId: this.id,
            severity: "critical",
            message: `Fallo del agente ${this.name}`,
          },
        ],
        events: [],
        confidence: 0,
        requiresApproval: true,
      };

      await this.memory.logAgentRun(
        this.id,
        context.phase,
        "error",
        context,
        errorOutput,
        Date.now() - start,
      );

      return errorOutput;
    }
  }
}
