import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/integrations/google-oauth";
import { DEFAULT_COMPANY_ID } from "@/lib/db/seed";

export async function GET() {
  try {
    const url = getAuthUrl(DEFAULT_COMPANY_ID);
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "OAuth no configurado",
        hint: "Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local. Ver docs/05-EMAIL-SETUP.md",
      },
      { status: 500 },
    );
  }
}
