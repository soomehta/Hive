# Google Calendar & Gmail Integration

Connect your Google account to let your PA manage your calendar and email on your behalf.

---

## 1. What You Can Do with Google Connected

| Feature | What the PA Can Do |
|---------|--------------------|
| **View calendar** | Tell you what meetings you have today/this week |
| **Block time** | Create focus time blocks on your calendar |
| **Schedule meetings** | Create calendar events with attendees |
| **Reschedule meetings** | Move or cancel existing events |
| **Read emails** | Check your unread emails and summarize them |
| **Send emails** | Draft and send emails on your behalf |

---

## 2. Connecting Your Google Account

1. Click **Integrations** in the sidebar (or go to `/dashboard/integrations`).
2. Find the **Google** card.
3. Click **Connect with Google**.
4. You'll be redirected to Google's consent screen.
5. Review the permissions being requested:
   - **Google Calendar** — read and create/modify events
   - **Gmail** — read emails and send on your behalf
6. Click **Allow**.
7. You'll be redirected back to Hive with a confirmation message.
8. The Google card now shows **Connected** with a green checkmark.

### Permissions Requested

| Permission | Why |
|------------|-----|
| `calendar` | View your calendar events |
| `calendar.events` | Create and modify calendar events |
| `gmail.readonly` | Read your unread emails |
| `gmail.send` | Send emails on your behalf |
| `gmail.compose` | Compose new emails |

---

## 3. Using Calendar Features

### Check Your Calendar

> "What's on my calendar today?"
> "Do I have any meetings tomorrow?"
> "Am I free Thursday afternoon?"

The PA reads your Google Calendar events and gives you a summary.

### Block Focus Time

> "Block 2 hours tomorrow morning for deep work"
> "Put a focus block on Friday from 1 to 3 PM"

The PA creates a calendar event titled "Focus Time" (or similar) on your calendar. This is a **Tier 2** action by default — it executes immediately and notifies you.

### Schedule a Meeting

> "Schedule a meeting with Sarah and Alex for Thursday at 2 PM, 30 minutes"
> "Set up a design review with the team next Monday at 10 AM"

The PA creates a calendar event with the specified attendees, time, and duration. This is a **Tier 3** action by default — the PA shows you a draft:

```
DRAFT: Create Calendar Event
Title: Design Review
Date: Monday, March 10 at 10:00 AM
Duration: 1 hour
Attendees: sarah@company.com, alex@company.com
Location: (none)

[Approve]  [Edit]  [Reject]
```

You can edit the details before confirming.

### Reschedule a Meeting

> "Move the standup to 10:30 tomorrow"
> "Cancel the design review on Friday"

The PA modifies or removes the event from your calendar. This is a **Tier 3** action — you'll see a draft first.

---

## 4. Using Email Features

### Check Emails

> "Do I have any unread emails?"
> "Any emails from the client?"
> "What's in my inbox?"

The PA reads your Gmail inbox and summarizes unread messages. This is a **Tier 1** action — instant, no approval needed.

### Send an Email

> "Send an email to sarah@company.com: subject 'Project Update', tell her we're on track for the March deadline"

The PA drafts the email and shows it to you for approval. This is always a **Tier 3** action — you review before sending:

```
DRAFT: Send Email
To: sarah@company.com
Subject: Project Update
Body:
Hi Sarah,

I wanted to let you know that we're on track for
the March deadline. The team has completed 80% of
the planned tasks and we're confident about delivery.

Best regards,
[Your name]

[Approve]  [Edit]  [Reject]
```

---

## 5. Token Refresh

Your Google connection stays active automatically:

- OAuth tokens are refreshed before they expire
- If a token refresh fails, the integration is marked as inactive and you're notified
- Simply reconnect by clicking **Connect with Google** again

---

## 6. Disconnecting Google

1. Go to **Integrations** page.
2. Find the Google card (showing "Connected").
3. Click **Disconnect**.
4. Your Google tokens are removed from Hive.

After disconnecting, calendar and email PA commands will return:
> "Google is not connected. Please connect it in Settings > Integrations."

---

## 7. Privacy & Security

- **Tokens are encrypted at rest** — your Google OAuth tokens are encrypted before storage
- **Minimal permissions** — Hive only requests the permissions it needs
- **No data storage** — Hive doesn't store your emails or calendar events; it reads them in real-time when you ask
- **You control access** — disconnect at any time; you can also revoke access from Google's security settings

---

## Next Steps

- **[Microsoft Integration](./15-microsoft-integration.md)** — connect Outlook and Microsoft Calendar
- **[Slack Integration](./16-slack-integration.md)** — connect Slack messaging
