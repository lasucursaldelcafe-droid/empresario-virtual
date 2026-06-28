import { NextResponse } from "next/server";
import { initDatabase } from "@/lib/db";
import { seedDemoData, DEFAULT_COMPANY_ID } from "@/lib/db/seed";
import { createAgent } from "@/lib/agents";
import { AGENT_IDS, type AgentId } from "@/lib/core/schemas";

export async function POST(request: Request) {
  await initDatabase();
  await seedDemoData();

  const body = await request.json();
  const agentId = body.agentId as AgentId;
  const phase = body.phase ?? "manual-run";
  const payload = body.payload;

  if (!AGENT_IDS.includes(agentId)) {
    return NextResponse.json({ error: "Agente inválido" }, { status: 400 });
  }

  const agent = createAgent(agentId, DEFAULT_COMPANY_ID);
  const output = await agent.run({
    companyId: DEFAULT_COMPANY_ID,
    phase,
    payload,
    date: body.date,
    inputs: body.inputs,
  });

  return NextResponse.json(output);
}

export async function GET() {
  return NextResponse.json({
    agents: [
      { id: "administrativo", name: "Administrativo", role: "Documentos y vencimientos" },
      { id: "financiero", name: "Financiero", role: "KPIs y rentabilidad" },
      { id: "contable", name: "Contable", role: "Soportes e impuestos" },
      { id: "operativo", name: "Operativo", role: "Turnos e inventario" },
      { id: "marketing", name: "Marketing", role: "Redes y campañas" },
      { id: "comercial", name: "Comercial", role: "CRM y clientes" },
      { id: "juridico", name: "Jurídico", role: "Obligaciones legales" },
      { id: "gerencial", name: "Gerencial", role: "Orquestador / Director virtual" },
    ],
  });
}
