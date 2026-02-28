import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getUnreadEmails, sendEmail } from "@/lib/integrations/google-mail";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const maxResults = Number(req.nextUrl.searchParams.get("maxResults")) || 10;
    const query = req.nextUrl.searchParams.get("query") ?? undefined;

    const emails = await getUnreadEmails(auth.userId, auth.orgId, { maxResults, query });
    return Response.json({ data: emails });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await req.json();
    const result = await sendEmail(auth.userId, auth.orgId, body);
    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
