import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { getUnreadEmails, sendEmail } from "@/lib/integrations/google-mail";
import { createLogger } from "@/lib/logger";

const log = createLogger("google-mail");

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const maxResults = Number(req.nextUrl.searchParams.get("maxResults")) || 10;
    const query = req.nextUrl.searchParams.get("query") ?? undefined;

    const emails = await getUnreadEmails(auth.userId, auth.orgId, { maxResults, query });
    return Response.json({ data: emails });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Google mail error");
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await req.json();
    const result = await sendEmail(auth.userId, auth.orgId, body);
    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Google mail send error");
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
