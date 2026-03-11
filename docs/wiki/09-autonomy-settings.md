# Autonomy Settings

Your PA's autonomy mode controls how independently it acts. This is the most important setting for your comfort level — choose how much you trust your PA to act without asking.

---

## 1. The Three Autonomy Modes

### Autopilot

The PA acts freely. Most actions execute immediately; only the highest-risk actions (sending emails, Slack messages, scheduling meetings with others) still require approval.

**Best for:** Power users who fully trust their PA and want maximum speed.

| Action | Behavior in Autopilot |
|--------|----------------------|
| Check tasks/calendar/email | Instant (auto-execute) |
| Create/update/complete tasks | Instant (auto-execute) |
| Add comments, flag blockers | Instant (auto-execute) |
| Block calendar time | Instant (auto-execute) |
| Generate reports | Instant (auto-execute) |
| Post project messages | Draft + Approve |
| Send emails | Draft + Approve |
| Send Slack messages | Draft + Approve |
| Schedule meetings | Draft + Approve |

### Copilot (Default)

The PA asks for approval on actions that affect others or go outside Hive. Actions on your own work execute immediately.

**Best for:** Most users. Balances speed with control.

| Action | Behavior in Copilot |
|--------|---------------------|
| Check tasks/calendar/email | Instant (auto-execute) |
| Create task for yourself | Execute + Notify |
| Create task for someone else | Draft + Approve |
| Update/complete tasks | Execute + Notify |
| Add comments, flag blockers | Execute + Notify |
| Block calendar time | Execute + Notify |
| Generate reports | Execute + Notify |
| Post project messages | Draft + Approve |
| Send emails | Draft + Approve |
| Send Slack messages | Draft + Approve |
| Schedule meetings | Draft + Approve |

### Manual

Everything requires your approval. The PA never executes without asking first.

**Best for:** New users getting comfortable with the PA, or high-stakes environments where every action must be reviewed.

| Action | Behavior in Manual |
|--------|-------------------|
| All queries | Instant (auto-execute — queries don't change anything) |
| Everything else | Draft + Approve |

---

## 2. Changing Your Autonomy Mode

1. Click **Settings** in the sidebar.
2. Go to **PA Settings** (or navigate directly to `/dashboard/settings/pa`).
3. Under **Autonomy Mode**, select one of:
   - Autopilot
   - Copilot (recommended)
   - Manual
4. Changes take effect immediately.

### Using Your PA

> "Switch me to autopilot mode"
> "Set my PA to manual mode"

---

## 3. Per-Action Overrides

You can override the tier for specific action types, regardless of your autonomy mode. This lets you mix and match.

**Example setup:**
- Autonomy mode: **Copilot** (default behavior)
- Override: Send emails → **Draft + Approve** (always want to review emails)
- Override: Block calendar → **Auto-execute** (trust the PA to block focus time)
- Override: Create tasks → **Auto-execute** (even for others)

### Setting Per-Action Overrides

1. Go to **Settings > PA Settings**.
2. Under **Per-Action Overrides**, you'll see a list of action types:

```
Send emails ............. [Draft + Approve]
Create tasks ............ [Execute + Notify]
Block calendar .......... [Auto-execute]
Post messages ........... [Draft + Approve]
Send Slack messages ..... [Draft + Approve]
Schedule meetings ....... [Draft + Approve]
Update tasks ............ [Execute + Notify]
Complete tasks .......... [Execute + Notify]
Add comments ............ [Execute + Notify]
Flag blockers ........... [Execute + Notify]
Generate reports ........ [Execute + Notify]
```

3. Click the dropdown next to any action type and select your preferred tier:
   - **Auto-execute** — do it, don't ask
   - **Execute + Notify** — do it, tell me after
   - **Draft + Approve** — show me first
   - **Suggest Only** — just suggest, I'll do it myself
4. Changes take effect immediately.

---

## 4. Override Priority

When the PA determines the tier for an action, it checks in this order:

1. **Per-action override** (your custom setting for this specific action type) — highest priority
2. **Autonomy mode rules** (autopilot/copilot/manual defaults)
3. **Default tier** (built-in default for the action type)

This means a per-action override always wins. If you're in Autopilot mode but set "send emails" to "Draft + Approve," emails will always require approval.

---

## 5. Recommended Setups

### "I Trust My PA" Setup
- Mode: **Autopilot**
- Override: Send emails → **Draft + Approve** (safety net for external comms)
- Everything else: default autopilot behavior

### "Balanced" Setup (Default)
- Mode: **Copilot**
- No overrides needed — the defaults are well-tuned

### "I'm New Here" Setup
- Mode: **Manual**
- After a week, switch to Copilot once you're comfortable

### "Busy Manager" Setup
- Mode: **Copilot**
- Override: Create tasks → **Auto-execute** (even for others)
- Override: Block calendar → **Auto-execute**
- Override: Post messages → **Execute + Notify** (skip approval for team messages)

---

## 6. Tips

1. **Start with Copilot** — it's the safest productive mode
2. **Watch the PA for a week** — observe which drafts you approve without changes; those are candidates for upgrading to Execute + Notify or Auto-execute
3. **Keep Draft + Approve for external communications** — emails and Slack messages go to people outside your immediate view; always review
4. **Use per-action overrides** rather than switching entire modes — mix the best of each tier
5. **You can change anytime** — there's no penalty for switching modes

---

## Next Steps

- **[PA Profile & Preferences](./17-pa-profile-and-preferences.md)** — customize communication style, working hours, and more
- **[Actions & Approvals](./08-actions-and-approvals.md)** — understand the approval workflow
