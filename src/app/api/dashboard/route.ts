import { NextResponse } from "next/server";
import { initDatabase } from "@/lib/db";
import { seedDemoData, DEFAULT_COMPANY_ID } from "@/lib/db/seed";
import { getIntegrationStatus } from "@/lib/integrations/google-oauth";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function GET() {
  await initDatabase();
  await seedDemoData();

  const [alerts, reports, integration] = await Promise.all([
    db
      .select()
      .from(schema.alerts)
      .where(eq(schema.alerts.companyId, DEFAULT_COMPANY_ID))
      .orderBy(desc(schema.alerts.createdAt))
      .limit(10),
    db
      .select()
      .from(schema.reports)
      .where(eq(schema.reports.companyId, DEFAULT_COMPANY_ID))
      .orderBy(desc(schema.reports.createdAt))
      .limit(3),
    getIntegrationStatus(DEFAULT_COMPANY_ID),
  ]);

  return NextResponse.json({ alerts, reports, integration });
}
