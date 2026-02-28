import { Client } from "@microsoft/microsoft-graph-client";

/**
 * Creates an authenticated Microsoft Graph API client from a raw access token.
 * Used by both microsoft-calendar.ts and microsoft-mail.ts.
 */
export function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}
