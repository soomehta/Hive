import { google } from "googleapis";
import { getActiveIntegration } from "./oauth";
import type { EmailMessage } from "@/types/integrations";
import { withRetry } from "@/lib/utils/retry";

function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

export async function getUnreadEmails(
  userId: string,
  orgId: string,
  params: { maxResults?: number; query?: string }
): Promise<EmailMessage[]> {
  const integration = await getActiveIntegration(userId, orgId, "google");
  if (!integration) throw new Error("Google integration not connected");

  const gmail = getGmailClient(integration.decryptedAccessToken);
  const res = await withRetry(
    () => gmail.users.messages.list({
    userId: "me",
    q: params.query ?? "is:unread",
    maxResults: params.maxResults ?? 10,
  }),
    { label: "google-mail:getUnread" }
  );

  const messages: EmailMessage[] = [];
  for (const msg of res.data.messages ?? []) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });

    const headers = detail.data.payload?.headers ?? [];
    messages.push({
      id: msg.id!,
      from: headers.find((h) => h.name === "From")?.value ?? "",
      subject: headers.find((h) => h.name === "Subject")?.value ?? "",
      snippet: detail.data.snippet ?? "",
      date: headers.find((h) => h.name === "Date")?.value ?? "",
    });
  }

  return messages;
}

export async function sendEmail(
  userId: string,
  orgId: string,
  email: { to: string; cc?: string; subject: string; body: string }
): Promise<{ messageId: string }> {
  const integration = await getActiveIntegration(userId, orgId, "google");
  if (!integration) throw new Error("Google integration not connected");

  const gmail = getGmailClient(integration.decryptedAccessToken);

  const headers = [
    `To: ${email.to}`,
    email.cc ? `Cc: ${email.cc}` : "",
    `Subject: ${email.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    email.body,
  ].filter(Boolean).join("\r\n");

  const encodedMessage = Buffer.from(headers).toString("base64url");

  const res = await withRetry(
    () => gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    }),
    { label: "google-mail:send" }
  );

  return { messageId: res.data.id! };
}
