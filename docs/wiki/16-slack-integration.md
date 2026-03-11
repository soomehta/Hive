# Slack Integration

Connect your Slack workspace to let your PA send messages to Slack channels and direct messages on your behalf.

---

## 1. What You Can Do with Slack Connected

| Feature | What the PA Can Do |
|---------|--------------------|
| **Send channel messages** | Post messages to any Slack channel you have access to |
| **Send direct messages** | Send DMs to Slack users |

---

## 2. Connecting Slack

1. Click **Integrations** in the sidebar.
2. Find the **Slack** card.
3. Click **Connect with Slack**.
4. You'll be redirected to Slack's OAuth consent screen.
5. Select the **Slack workspace** you want to connect.
6. Review the permissions and click **Allow**.
7. You'll be redirected back to Hive with a confirmation.
8. The Slack card now shows **Connected** with a green checkmark.

---

## 3. Sending Slack Messages

### To a Channel

> "Send a Slack message to #engineering: Deploy is scheduled for 3pm today"
> "Post in #design: The client approved the new mockups"

### As a Direct Message

> "Send a Slack DM to Sarah: Can we sync on the API design tomorrow?"

### Approval Flow

Sending Slack messages is a **Tier 3 (Draft + Approve)** action by default. The PA shows you a preview:

```
DRAFT: Send Slack Message
Channel: #engineering
Message:
Deploy is scheduled for 3pm today. All services
will be briefly unavailable during the rollout.

[Approve]  [Edit]  [Reject]
```

You can edit the message before sending, or reject to cancel.

---

## 4. Channel References

When specifying Slack channels, you can use:

- **Channel name** — `#engineering`, `#design`, `engineering` (with or without `#`)
- **Channel ID** — the Slack channel ID (if you know it)

For DMs, use the person's name and the PA will match it to the Slack user.

---

## 5. Customizing Slack Tier

If you send Slack messages frequently and don't want to approve each one, you can change the tier:

1. Go to **Settings > PA Settings**.
2. Under **Per-Action Overrides**, find "Send Slack messages."
3. Change from **Draft + Approve** to **Execute + Notify**.

Now the PA will send Slack messages immediately and just tell you it did.

---

## 6. Disconnecting Slack

1. Go to the **Integrations** page.
2. Find the Slack card.
3. Click **Disconnect**.

You can also revoke access from your Slack workspace settings under **Apps**.

---

## 7. Privacy & Security

- **Tokens are encrypted at rest**
- **Messages are not stored** — Hive sends the message and doesn't keep a copy (the Slack workspace retains the message history as usual)
- **Scoped access** — Hive only sends messages as you; it doesn't read your Slack messages or access other workspace data
- **Automatic token refresh** — stays connected seamlessly

---

## Next Steps

- **[PA Profile & Preferences](./17-pa-profile-and-preferences.md)** — customize your notification channel to Slack
- **[Google Integration](./14-google-integration.md)** — connect Google Calendar and Gmail
