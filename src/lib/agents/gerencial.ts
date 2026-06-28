import { BaseAgent } from "./base";
import type { AgentContext, AgentOutput, AgentId } from "../core/schemas";

/**
 * Agente Gerencial — Orquestador / Foreman.
 * Sintetiza outputs de todos los agentes y genera el reporte ejecutivo.
 * Referencia: Foreman Pattern (Knowlee 2026) — único punto de síntesis.
 */
export class GerencialAgent extends BaseAgent {
  readonly id = "gerencial" as const;
  readonly name = "Agente Gerencial";
  readonly description = "Director administrativo virtual — sintetiza, prioriza y recomienda";

  async execute(context: AgentContext): Promise<AgentOutput> {
    const inputs = context.inputs ?? [];
    const date = context.date ?? new Date().toISOString().slice(0, 10);

    const allAlerts = inputs.flatMap((i) => i.alerts);
    const critical = allAlerts.filter((a) => a.severity === "critical");
    const warnings = allAlerts.filter((a) => a.severity === "warning");

    const financiero = inputs.find((i) => i.agentId === "financiero");
    const kpis = financiero?.data as Record<string, number> | undefined;

    const working = inputs.filter((i) => i.status === "success" && !i.alerts.some((a) => a.severity === "critical"));
    const issues = inputs.filter((i) => i.alerts.length > 0 || i.status !== "success");

    const executiveSummary = this.buildExecutiveSummary({
      date,
      working: working.map((w) => w.agentId),
      issues: issues.map((i) => ({ agent: i.agentId, summary: i.summary })),
      kpis,
      criticalCount: critical.length,
      warningCount: warnings.length,
    });

    await this.memory.saveReport("daily", date, executiveSummary);

    return {
      agentId: this.id,
      status: "success",
      summary: executiveSummary.split("\n")[0] ?? "Reporte gerencial generado",
      data: {
        executiveSummary,
        agentSummaries: inputs.map((i) => ({
          agentId: i.agentId,
          summary: i.summary,
          status: i.status,
        })),
        kpis,
        alertCounts: { critical: critical.length, warning: warnings.length, info: allAlerts.length - critical.length - warnings.length },
      },
      alerts: critical.length > 0
        ? [{
            agentId: this.id,
            severity: "critical" as const,
            message: `${critical.length} alertas críticas requieren atención inmediata`,
          }]
        : [],
      events: [
        {
          type: "REPORT_GENERATED",
          payload: { reportType: "daily", date, content: executiveSummary },
        },
      ],
      confidence: 0.95,
      requiresApproval: critical.length > 0,
    };
  }

  private buildExecutiveSummary(params: {
    date: string;
    working: AgentId[];
    issues: { agent: AgentId; summary: string }[];
    kpis?: Record<string, number>;
    criticalCount: number;
    warningCount: number;
  }): string {
    const lines: string[] = [
      `📊 REPORTE GERENCIAL — ${params.date}`,
      "",
      "## Resumen ejecutivo",
    ];

    if (params.kpis) {
      lines.push(
        `- Ventas del día: $${(params.kpis.sales ?? 0).toLocaleString()}`,
        `- Gastos: $${(params.kpis.expenses ?? 0).toLocaleString()}`,
        `- Utilidad: $${(params.kpis.profit ?? 0).toLocaleString()}`,
      );
      if (params.kpis.profitChangePercent !== undefined) {
        const dir = params.kpis.profitChangePercent >= 0 ? "aumentaron" : "disminuyeron";
        lines.push(`- Utilidades ${dir} ${Math.abs(params.kpis.profitChangePercent).toFixed(1)}% vs periodo anterior`);
      }
    }

    lines.push("", "## ✅ Qué está funcionando");
    if (params.working.length === 0) {
      lines.push("- Revisar alertas pendientes");
    } else {
      for (const agent of params.working) {
        lines.push(`- Agente ${agent}: operando normalmente`);
      }
    }

    lines.push("", "## ⚠️ Qué requiere atención");
    if (params.issues.length === 0) {
      lines.push("- Sin incidencias relevantes");
    } else {
      for (const issue of params.issues) {
        lines.push(`- [${issue.agent}] ${issue.summary}`);
      }
    }

    lines.push(
      "",
      "## 🎯 Recomendaciones",
      params.criticalCount > 0
        ? `- Atender ${params.criticalCount} alertas críticas hoy`
        : "- Mantener ritmo operativo actual",
      params.warningCount > 0
        ? `- Revisar ${params.warningCount} advertencias esta semana`
        : "- Programar revisión semanal de indicadores",
      "",
      "---",
      "Generado por Empresario Virtual — Tu equipo administrativo con IA",
    );

    return lines.join("\n");
  }
}
