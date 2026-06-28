import { AdministrativoAgent } from "./administrativo";
import { FinancieroAgent } from "./financiero";
import { ContableAgent } from "./contable";
import { OperativoAgent } from "./operativo";
import { MarketingAgent } from "./marketing";
import { ComercialAgent } from "./comercial";
import { JuridicoAgent } from "./juridico";
import { GerencialAgent } from "./gerencial";
import type { BaseAgent } from "./base";
import type { AgentId } from "../core/schemas";

export function createAgent(agentId: AgentId, companyId: string): BaseAgent {
  const agents: Record<AgentId, new (companyId: string) => BaseAgent> = {
    administrativo: AdministrativoAgent,
    financiero: FinancieroAgent,
    contable: ContableAgent,
    operativo: OperativoAgent,
    marketing: MarketingAgent,
    comercial: ComercialAgent,
    juridico: JuridicoAgent,
    gerencial: GerencialAgent,
  };

  const AgentClass = agents[agentId];
  return new AgentClass(companyId);
}

export {
  AdministrativoAgent,
  FinancieroAgent,
  ContableAgent,
  OperativoAgent,
  MarketingAgent,
  ComercialAgent,
  JuridicoAgent,
  GerencialAgent,
};

export const SPECIALIST_AGENTS: AgentId[] = [
  "administrativo",
  "financiero",
  "contable",
  "operativo",
  "comercial",
  "marketing",
  "juridico",
];

export const DAILY_CLOSE_SEQUENCE: AgentId[] = [
  ...SPECIALIST_AGENTS,
  "gerencial",
];
