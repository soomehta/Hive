# Microsoft Outlook & Calendar Integration

Connect your Microsoft account to let your PA manage your Outlook calendar and email on your behalf.

---

## 1. What You Can Do with Microsoft Connected

| Feature | What the PA Can Do |
|---------|--------------------|
| **View calendar** | Tell you what meetings you have today/this week |
| **Block time** | Create focus time blocks on your Outlook calendar |
| **Schedule meetings** | Create calendar events with attendees |
| **Reschedule meetings** | Move or cancel existing events |
| **Read emails** | Check your unread Outlook emails and summarize them |
| **Send emails** | Draft and send emails via Outlook on your behalf |

The features are identical to the [Google integration](./14-google-integration.md) — the PA works the same way regardless of which provider you use.

---

## 2. Connecting Your Microsoft Account

1. Click **Integrations** in the sidebar.
2. Find the **Microsoft** card.
3. Click **Connect with Microsoft**.
4. You'll be redirected to Microsoft's consent screen.
5. Sign in with your Microsoft account (personal, work, or school).
6. Review and accept the requested permissions:
   - Read and write your calendar
   - Read your mail
   - Send mail on your behalf
7. You'll be redirected back to Hive with a confirmation.
8. The Microsoft card now shows **Connected** with a green checkmark.

---

## 3. Using Calendar and Email

All calendar and email PA commands work exactly the same as with Google. Your PA automatically uses whichever provider you've connected.

### Calendar Commands

> "What's on my calendar today?"
> "Block 2 hours for focused work tomorrow morning"
> "Schedule a meeting with Sarah for Thursday at 2pm"
> "Cancel the 3pm meeting on Friday"

### Email Commands

> "Do I have any unread emails?"
> "Send an email to client@example.com with a project update"

See the [Google Integration guide](./14-google-integration.md#3-using-calendar-features) for detailed examples — the PA commands are identical.

---

## 4. Google vs. Microsoft — Can I Connect Both?

Currently, each integration slot (calendar, email) connects to one provider at a time. If you connect both Google and Microsoft:

- The PA uses the most recently connected provider by default
- You can specify: "Check my Google Calendar" or "Check my Outlook"

For most users, connecting one provider is sufficient.

---

## 5. Disconnecting Microsoft

1. Go to the **Integrations** page.
2. Find the Microsoft card.
3. Click **Disconnect**.

You can also revoke access from your Microsoft account security settings at [account.microsoft.com](https://account.microsoft.com).

---

## 6. Privacy & Security

- **Tokens are encrypted at rest** — your Microsoft OAuth tokens are encrypted before storage
- **No data storage** — Hive reads your calendar and email in real-time; it doesn't store copies
- **Automatic token refresh** — tokens are refreshed seamlessly before expiry
- **Disconnect anytime** — revoking access immediately stops all PA access to your Microsoft data

---

## Next Steps

- **[Slack Integration](./16-slack-integration.md)** — connect Slack
- **[Google Integration](./14-google-integration.md)** — if you use Google instead
