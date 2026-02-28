import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { createOAuthState } from "@/lib/integrations/oauth-state";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";

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
    const rl = await rateLimit(`oauth:microsoft:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

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
    return errorResponse(error);
  }
}
