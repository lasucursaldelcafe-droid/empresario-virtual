import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/integrations/google-oauth";
import { initDatabase } from "@/lib/db";

export async function GET(request: Request) {
  await initDatabase();

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? "default-company";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Código OAuth faltante" }, { status: 400 });
  }

  try {
    const result = await exchangeCodeForTokens(code, state);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?success=true&email=${encodeURIComponent(result.email)}`,
        request.url,
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error OAuth";
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
