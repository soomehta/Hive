import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getEvents, createEvent } from "@/lib/integrations/microsoft-calendar";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const timeMin = req.nextUrl.searchParams.get("timeMin") ?? new Date().toISOString();
    const timeMax = req.nextUrl.searchParams.get("timeMax") ?? new Date(Date.now() + 7 * 86400000).toISOString();
    const maxResults = Number(req.nextUrl.searchParams.get("maxResults")) || 20;

    const events = await getEvents(auth.userId, auth.orgId, { timeMin, timeMax, maxResults });
    return Response.json({ data: events });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await req.json();
    const event = await createEvent(auth.userId, auth.orgId, body);
    return Response.json({ data: event }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
