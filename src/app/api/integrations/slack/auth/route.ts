import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { createOAuthState } from "@/lib/integrations/oauth-state";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`oauth:slack:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      scope: "chat:write,channels:read,users:read",
      redirect_uri: process.env.SLACK_REDIRECT_URI!,
      state: createOAuthState(auth.userId, auth.orgId),
    });

    return Response.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
  } catch (error) {
    return errorResponse(error);
  }
}
