import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { getEvents, createEvent } from "@/lib/integrations/google-calendar";
import { createLogger } from "@/lib/logger";

const log = createLogger("google-calendar");

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const timeMin = req.nextUrl.searchParams.get("timeMin") ?? new Date().toISOString();
    const timeMax = req.nextUrl.searchParams.get("timeMax") ?? new Date(Date.now() + 7 * 86400000).toISOString();
    const maxResults = Number(req.nextUrl.searchParams.get("maxResults")) || 20;

    const events = await getEvents(auth.userId, auth.orgId, { timeMin, timeMax, maxResults });
    return Response.json({ data: events });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Google calendar error");
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await req.json();
    const event = await createEvent(auth.userId, auth.orgId, body);
    return Response.json({ data: event }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Google calendar create error");
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
