import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { createOAuthState } from "@/lib/integrations/oauth-state";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      scope: "chat:write,channels:read,users:read",
      redirect_uri: process.env.SLACK_REDIRECT_URI!,
      state: createOAuthState(auth.userId, auth.orgId),
    });

    return Response.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
