import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { createOAuthState } from "@/lib/integrations/oauth-state";

const MICROSOFT_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.ReadWrite",
  "Mail.ReadWrite",
  "Mail.Send",
].join(" ");

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      response_type: "code",
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
      scope: MICROSOFT_SCOPES,
      response_mode: "query",
      state: createOAuthState(auth.userId, auth.orgId),
    });

    return Response.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
