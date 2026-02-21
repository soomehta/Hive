import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function verifyCsrfOrigin(request: NextRequest): boolean {
  // Only check state-changing methods
  if (SAFE_METHODS.has(request.method)) return true;

  // Skip CSRF check for cron endpoints (they use Bearer token auth)
  if (request.nextUrl.pathname.startsWith("/api/cron/")) return true;

  const origin = request.headers.get("origin");
  // If there's no Origin header, fall back to Referer
  const referer = request.headers.get("referer");

  const host = request.headers.get("host");
  if (!host) return false;

  const allowedOrigin = `https://${host}`;
  const allowedOriginHttp = `http://${host}`; // for local dev

  if (origin) {
    return origin === allowedOrigin || origin === allowedOriginHttp;
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      return refererOrigin === allowedOrigin || refererOrigin === allowedOriginHttp;
    } catch {
      return false;
    }
  }

  // No Origin or Referer — allow for non-browser clients (server-to-server)
  return true;
}

export async function proxy(request: NextRequest) {
  // CSRF origin check for state-changing requests
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: origin mismatch" },
      { status: 403 }
    );
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
