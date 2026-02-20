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

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return Response.redirect(new URL("/dashboard/integrations?error=token_exchange", req.url));
    }

    const tokens = await tokenRes.json();

    // Get user info to store email
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};

    await createIntegration({
      userId: state.userId,
      orgId: state.orgId,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
      scopes: tokens.scope?.split(" "),
      providerAccountId: userInfo.id,
      providerAccountEmail: userInfo.email,
    });

    return Response.redirect(new URL("/dashboard/integrations?connected=google", req.url));
  } catch (error) {
    console.error("Google callback error:", error);
    return Response.redirect(new URL("/dashboard/integrations?error=callback_failed", req.url));
  }
}
