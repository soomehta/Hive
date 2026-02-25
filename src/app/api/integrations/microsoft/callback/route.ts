import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { createIntegration } from "@/lib/db/queries/integrations";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";
import { createServerClient } from "@supabase/ssr";

const log = createLogger("microsoft-callback");

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

    // Verify the current session user matches the state user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== state.userId) {
      return Response.redirect(new URL("/dashboard/integrations?error=user_mismatch", req.url));
    }

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
    log.error({ err: error }, "Microsoft callback error");
    return Response.redirect(new URL("/dashboard/integrations?error=callback_failed", req.url));
  }
}
