import { NextResponse } from "next/server";
import { initDatabase } from "@/lib/db";
import { seedDemoData } from "@/lib/db/seed";

/**
 * Inicialización one-shot en producción (Turso).
 * Protegido con SETUP_SECRET en variables de entorno de Vercel.
 * GET /api/setup?secret=TU_SETUP_SECRET
 */
export async function GET(request: Request) {
  const secret = process.env.SETUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SETUP_SECRET no configurado en el servidor" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await initDatabase();
  const companyId = await seedDemoData();

  return NextResponse.json({
    ok: true,
    message: "Base de datos inicializada con datos demo",
    companyId,
  });
}
