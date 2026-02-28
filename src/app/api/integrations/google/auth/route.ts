import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { createOAuthState } from "@/lib/integrations/oauth-state";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`oauth:google:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: createOAuthState(auth.userId, auth.orgId),
    });

    return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  } catch (error) {
    return errorResponse(error);
  }
}
