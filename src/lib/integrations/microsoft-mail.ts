import { Client } from "@microsoft/microsoft-graph-client";
import { getActiveIntegration } from "./oauth";
import type { EmailMessage } from "@/types/integrations";

function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

export async function getUnreadEmails(
  userId: string,
  orgId: string,
  params: { maxResults?: number; query?: string }
): Promise<EmailMessage[]> {
  const integration = await getActiveIntegration(userId, orgId, "microsoft");
  if (!integration) throw new Error("Microsoft integration not connected");

  const client = getGraphClient(integration.decryptedAccessToken);
  let apiCall = client.api("/me/messages").filter("isRead eq false").top(params.maxResults ?? 10).orderby("receivedDateTime desc");

  if (params.query) {
    apiCall = client.api("/me/messages").search(`"${params.query}"`).top(params.maxResults ?? 10);
  }

  const res = await apiCall.get();

  return (res.value ?? []).map((m: any) => ({
    id: m.id,
    from: m.from?.emailAddress?.address ?? "",
    subject: m.subject ?? "",
    snippet: m.bodyPreview ?? "",
    date: m.receivedDateTime ?? "",
  }));
}

export async function sendEmail(
  userId: string,
  orgId: string,
  email: { to: string; cc?: string; subject: string; body: string }
): Promise<{ messageId: string }> {
  const integration = await getActiveIntegration(userId, orgId, "microsoft");
  if (!integration) throw new Error("Microsoft integration not connected");

  const client = getGraphClient(integration.decryptedAccessToken);
  const message: any = {
    subject: email.subject,
    body: { contentType: "Text", content: email.body },
    toRecipients: [{ emailAddress: { address: email.to } }],
  };
  if (email.cc) {
    message.ccRecipients = [{ emailAddress: { address: email.cc } }];
  }

  await client.api("/me/sendMail").post({ message });

  return { messageId: "sent" };
}
