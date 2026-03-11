# PA Profile & Preferences

Your PA profile controls how your Personal Assistant communicates, when it sends briefings, and how it learns from your work patterns.

---

## 1. Accessing PA Settings

1. Click **Settings** in the sidebar.
2. Click **PA Settings** (or navigate to `/dashboard/settings/pa`).

---

## 2. Settings Overview

The PA Settings page is organized into these sections:

### Autonomy Mode
Controls how independently the PA acts. Covered in detail in [Autonomy Settings](./09-autonomy-settings.md).

- **Autopilot** — PA acts freely, only asks for high-risk actions
- **Copilot** (default) — PA asks before actions that affect others
- **Manual** — PA asks before every action

### Per-Action Overrides
Customize the tier for individual action types. See [Autonomy Settings](./09-autonomy-settings.md) for full details.

### Briefings
Configure automated briefings and digests:

| Setting | Default | Options |
|---------|---------|---------|
| **Morning briefing** | Enabled | On/Off |
| **Briefing time** | 8:45 AM | Any time (HH:MM) |
| **End-of-day digest** | Disabled | On/Off |
| **End-of-day time** | 5:30 PM | Any time |
| **Weekly digest** | Enabled | On/Off |
| **Weekly digest day** | Friday | Any day of the week |

### Communication Style

| Setting | Default | Options |
|---------|---------|---------|
| **Response length** | Concise | Concise, Detailed, Bullet Points |
| **Tone** | Professional | Casual, Professional, Mixed |

- **Concise** — short, direct responses. Best for quick tasks.
- **Detailed** — longer responses with more context and explanation.
- **Bullet Points** — structured, scannable responses.

- **Casual** — friendly, informal tone.
- **Professional** — formal, business-appropriate tone.
- **Mixed** — adapts based on context (informal for quick tasks, formal for emails).

### Working Hours

| Setting | Default |
|---------|---------|
| **Start time** | 9:00 AM |
| **End time** | 5:00 PM |
| **Timezone** | Auto-detected from browser |

Working hours affect:
- When morning briefings are delivered
- When nudges and reminders fire (only during working hours)
- How the PA interprets relative time references ("this afternoon", "end of day")

### Languages

| Setting | Default |
|---------|---------|
| **Primary language** | English |
| **Additional languages** | None |

Setting your languages:
- Improves voice transcription accuracy for non-English speech
- Helps the PA respond in your preferred language
- Can be used for multilingual teams

### Notification Channel

| Setting | Default | Options |
|---------|---------|---------|
| **Preferred channel** | In-app | In-app, Email, Slack |

This controls where briefings, digests, and nudges are delivered:
- **In-app** — notifications appear in Hive's notification panel and PA chat
- **Email** — sent to your account email via Resend
- **Slack** — sent as a Slack DM (requires [Slack integration](./16-slack-integration.md))

---

## 3. Changing Settings

All settings can be changed on the PA Settings page:

1. Navigate to the setting you want to change.
2. Click the control (dropdown, toggle, time picker, etc.).
3. Select your preferred value.
4. Changes save automatically.

### Using Your PA

You can also change settings by telling your PA:

> "Set my morning briefing to 7:30 AM"
> "Switch my PA to autopilot mode"
> "Change my response style to bullet points"
> "Set my timezone to US Eastern"
> "Send my notifications via email instead of in-app"

---

## 4. Connected Accounts

The PA Settings page also shows your integration status:

```
Connected Accounts
Google .... [Connected] [Disconnect]
Slack ..... [Connect]
Microsoft . [Connect]
```

Click **Connect** to set up an integration, or **Disconnect** to remove one. See the integration guides for details:
- [Google](./14-google-integration.md)
- [Microsoft](./15-microsoft-integration.md)
- [Slack](./16-slack-integration.md)

---

## 5. Learned Patterns

Over time, your PA learns from your interactions. These are visible (but not directly editable) on the PA Settings page:

| Learned Pattern | What It Means |
|-----------------|---------------|
| **Average tasks per week** | How many tasks you typically create or complete per week |
| **Peak hours** | When you're most active (e.g., 9-11:30 AM, 2-4 PM) |
| **Common blockers** | Recurring reasons you get blocked (e.g., "waiting on design") |
| **Task duration accuracy** | How accurate your time estimates are (0.0 - 1.0) |
| **Total interactions** | How many messages you've exchanged with the PA |
| **Common intents** | Which actions you request most often |

These patterns help the PA:
- Suggest better time estimates for new tasks
- Anticipate what you need before you ask
- Tailor briefings to your work rhythm
- Improve action planning accuracy

### How Learning Works

- The PA updates patterns **automatically** after each interaction
- Every **50 interactions**: recalculates task metrics and duration accuracy
- Every **100 interactions**: analyzes communication patterns and habits
- **Corrections** (when you edit or reject a PA draft) are recorded and used to improve future outputs

---

## 6. Resetting Your PA

If you want to start fresh with your PA:

- **Reset learned patterns** — clears the PA's learned data (average tasks, peak hours, common intents) but keeps your preferences (autonomy mode, briefing times, etc.)
- **Reset everything** — clears all PA data including preferences, returning to defaults

Contact your admin or use the settings page if this option is available.

---

## 7. Tips

1. **Set your timezone accurately** — this affects briefing times, date interpretation, and working hours
2. **Start with "Concise" + "Professional"** — you can always switch to detailed or casual later
3. **Review learned patterns occasionally** — they give you insight into your work habits
4. **Set working hours honestly** — the PA won't send nudges outside these hours
5. **Use per-action overrides over mode changes** — it's more granular and doesn't affect everything

---

## Next Steps

- **[Notifications](./18-notifications.md)** — understand all notification types and how to manage them
- **[Autonomy Settings](./09-autonomy-settings.md)** — deep dive into controlling PA behavior
