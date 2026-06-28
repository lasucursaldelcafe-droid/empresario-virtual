import { z } from "zod";

export const AGENT_IDS = [
  "administrativo",
  "financiero",
  "contable",
  "operativo",
  "marketing",
  "comercial",
  "juridico",
  "gerencial",
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export const AlertSeverity = z.enum(["info", "warning", "critical"]);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

export const AlertSchema = z.object({
  severity: AlertSeverity,
  message: z.string(),
  agentId: z.string(),
});

export type Alert = z.infer<typeof AlertSchema>;

export const AgentEventSchema = z.object({
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export type AgentEvent = z.infer<typeof AgentEventSchema>;

export const AgentOutputSchema = z.object({
  agentId: z.enum(AGENT_IDS),
  status: z.enum(["success", "partial", "error"]),
  summary: z.string(),
  data: z.record(z.string(), z.unknown()),
  alerts: z.array(AlertSchema),
  events: z.array(AgentEventSchema),
  confidence: z.number().min(0).max(1),
  requiresApproval: z.boolean(),
});

export type AgentOutput = z.infer<typeof AgentOutputSchema>;

export const AgentContextSchema = z.object({
  companyId: z.string(),
  phase: z.string(),
  date: z.string().optional(),
  inputs: z.array(AgentOutputSchema).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type AgentContext = z.infer<typeof AgentContextSchema>;

export const DailyCloseResultSchema = z.object({
  date: z.string(),
  agentResults: z.array(AgentOutputSchema),
  executiveSummary: z.string(),
  topAlerts: z.array(AlertSchema),
  kpis: z.object({
    sales: z.number(),
    expenses: z.number(),
    profit: z.number(),
    profitChangePercent: z.number().optional(),
  }),
});

export type DailyCloseResult = z.infer<typeof DailyCloseResultSchema>;
