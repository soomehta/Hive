import { NextRequest } from "next/server";
import { createIntegration } from "@/lib/db/queries/integrations";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const stateStr = req.nextUrl.searchParams.get("state");
    const error = req.nextUrl.searchParams.get("error");

    if (error) {
      return Response.redirect(new URL("/dashboard/integrations?error=denied", req.url));
    }

    if (!code || !stateStr) {
      return Response.redirect(new URL("/dashboard/integrations?error=missing_params", req.url));
    }

    let state: { userId: string; orgId: string };
    try {
      state = verifyOAuthState(stateStr);
    } catch {
      return Response.redirect(new URL("/dashboard/integrations?error=invalid_state", req.url));
    }

    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      }),
    });

    const data = await tokenRes.json();
    if (!data.ok) {
      return Response.redirect(new URL("/dashboard/integrations?error=token_exchange", req.url));
    }

    await createIntegration({
      userId: state.userId,
      orgId: state.orgId,
      provider: "slack",
      accessToken: data.access_token,
      scopes: data.scope?.split(","),
      providerAccountId: data.authed_user?.id,
      providerAccountEmail: data.authed_user?.id,
    });

    return Response.redirect(new URL("/dashboard/integrations?connected=slack", req.url));
  } catch (error) {
    console.error("Slack callback error:", error);
    return Response.redirect(new URL("/dashboard/integrations?error=callback_failed", req.url));
  }
}
