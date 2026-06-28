import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "exp://localhost:8081",
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin") ?? "";
  const allowed =
    ALLOWED_ORIGINS.some((o) => origin.startsWith(o.replace(/\/$/, ""))) ||
    origin.includes("exp://") ||
    process.env.NODE_ENV === "development";

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(allowed ? origin : ALLOWED_ORIGINS[0] ?? "*"),
    });
  }

  const response = NextResponse.next();
  const headers = corsHeaders(allowed ? origin : "*");
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export const config = {
  matcher: "/api/:path*",
};
