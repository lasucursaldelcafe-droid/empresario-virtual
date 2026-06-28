import { NextResponse } from "next/server";
import { initDatabase } from "@/lib/db";
import { seedDemoData, DEFAULT_COMPANY_ID } from "@/lib/db/seed";
import { Orchestrator } from "@/lib/core/orchestrator";
import { sendEmail } from "@/lib/integrations/google-oauth";

export async function POST(request: Request) {
  await initDatabase();
  await seedDemoData();

  const body = await request.json().catch(() => ({}));
  const date = (body as { date?: string }).date;
  const sendReport = (body as { sendEmail?: boolean }).sendEmail ?? false;

  const orchestrator = new Orchestrator(DEFAULT_COMPANY_ID);
  const result = await orchestrator.runDailyClose(date);

  let emailSent = false;
  if (sendReport && process.env.MAIN_EMAIL) {
    try {
      emailSent = await sendEmail(
        DEFAULT_COMPANY_ID,
        process.env.MAIN_EMAIL,
        `Reporte diario Empresario Virtual — ${result.date}`,
        result.executiveSummary,
      );
    } catch {
      emailSent = false;
    }
  }

  return NextResponse.json({ ...result, emailSent });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/daily-close",
    method: "POST",
    description: "Ejecuta cierre diario con los 8 agentes",
    body: { date: "YYYY-MM-DD (opcional)", sendEmail: true },
  });
}
