import { NextRequest } from "next/server";
import { createIntegration } from "@/lib/db/queries/integrations";

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

    const state = JSON.parse(stateStr) as { userId: string; orgId: string };

    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return Response.redirect(new URL("/dashboard/integrations?error=token_exchange", req.url));
    }

    const tokens = await tokenRes.json();

    // Get user info
    let email = "";
    try {
      const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        email = me.mail ?? me.userPrincipalName ?? "";
      }
    } catch {}

    await createIntegration({
      userId: state.userId,
      orgId: state.orgId,
      provider: "microsoft",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
      scopes: tokens.scope?.split(" "),
      providerAccountEmail: email,
    });

    return Response.redirect(new URL("/dashboard/integrations?connected=microsoft", req.url));
  } catch (error) {
    console.error("Microsoft callback error:", error);
    return Response.redirect(new URL("/dashboard/integrations?error=callback_failed", req.url));
  }
}
