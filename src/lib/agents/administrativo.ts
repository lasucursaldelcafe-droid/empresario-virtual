import { BaseAgent } from "./base";
import type { AgentContext, AgentOutput } from "../core/schemas";

export class AdministrativoAgent extends BaseAgent {
  readonly id = "administrativo" as const;
  readonly name = "Agente Administrativo";
  readonly description = "Organiza documentos, clasifica facturas y controla vencimientos";

  async execute(context: AgentContext): Promise<AgentOutput> {
    const date = context.date ?? new Date().toISOString().slice(0, 10);
    const pending = await this.memory.getPendingDocuments();

    const classified = pending.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      type: doc.type ?? this.inferType(doc.filename),
      category: doc.category ?? "general",
    }));

    const dueSoon = classified.filter((d) => d.type === "invoice").length;

    return {
      agentId: this.id,
      status: "success",
      summary: `${classified.length} documentos procesados. ${dueSoon} facturas identificadas.`,
      data: { date, classified, pendingCount: pending.length },
      alerts:
        pending.length > 10
          ? [
              {
                agentId: this.id,
                severity: "warning" as const,
                message: `Tienes ${pending.length} documentos pendientes de clasificar`,
              },
            ]
          : [],
      events: classified.map((d) => ({
        type: "DOCUMENT_CLASSIFIED",
        payload: { documentId: d.id, type: d.type },
      })),
      confidence: 0.85,
      requiresApproval: false,
    };
  }

  private inferType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes("factura") || lower.includes("invoice")) return "invoice";
    if (lower.includes("contrato") || lower.includes("contract")) return "contract";
    if (lower.includes("recibo") || lower.includes("receipt")) return "receipt";
    return "other";
  }
}
