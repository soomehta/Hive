import { getActiveIntegration } from "@/lib/integrations/oauth";
import * as googleMail from "@/lib/integrations/google-mail";
import * as microsoftMail from "@/lib/integrations/microsoft-mail";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleSendEmail(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.to || !payload.subject || !payload.body) {
    return { success: false, error: "Email requires to, subject, and body" };
  }

  const google = await getActiveIntegration(action.userId, action.orgId, "google");
  const microsoft = !google ? await getActiveIntegration(action.userId, action.orgId, "microsoft") : null;

  if (!google && !microsoft) {
    return { success: false, error: "No email integration connected. Connect Google or Microsoft in Settings > Integrations." };
  }

  try {
    const result = google
      ? await googleMail.sendEmail(action.userId, action.orgId, {
          to: payload.to,
          cc: payload.cc,
          subject: payload.subject,
          body: payload.body,
        })
      : await microsoftMail.sendEmail(action.userId, action.orgId, {
          to: payload.to,
          cc: payload.cc,
          subject: payload.subject,
          body: payload.body,
        });

    return { success: true, result: { messageId: result.messageId } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send email" };
  }
}
