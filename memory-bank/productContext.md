# Product Context: Hive

## Why This Project Exists

- **Simplicity:** Most PM tools are overloaded. Hive aims for Basecamp-level simplicity with 5 core modules.
- **AI as interface:** Instead of clicking through UIs, users talk or type to a PA that executes actions (create task, block calendar, send email) with graduated autonomy (auto / notify / draft-approve / suggest).
- **Voice-first:** Users can speak commands; transcription → intent → action pipeline is central.
- **Calm, async work:** No presence/typing; communication is message-based and async.

## Problems It Solves

- Too much context-switching between PM tool, calendar, email, Slack.
- Dashboards that don’t answer “what should I do?” — replaced by ask-a-question reporting and morning briefings.
- Friction of form-filling for every task/message — reduced by natural language and PA execution.

## How It Should Work

1. **Onboarding:** User signs up (Clerk), creates or joins an organization, completes profile (optional PA preferences).
2. **Daily use:** User opens dashboard; sees morning briefing and “my tasks.” PA panel is always available (text or voice).
3. **Commands:** User says or types “Create a task in Project X for Sarah: review design by Friday.” PA classifies intent, plans action(s), executes per tier (e.g. draft_approve → user approves/edits → execute).
4. **Integrations:** User connects Google/Microsoft/Slack; PA can read calendar, send email, post to Slack on their behalf (within autonomy settings).
5. **Reporting:** User asks “What’s blocking the launch?” → PA generates a narrative report from tasks, messages, activity (RAG over pgvector).

## User Experience Goals

- **PA as primary interface:** Chat/voice is the main way to act; UI supports browsing, editing, and approval.
- **Graduated autonomy:** User chooses autopilot / copilot / manual and per-action overrides (e.g. send_email always draft_approve).
- **Transparency:** Pending actions are clear (approve / edit / reject); execution results are visible.
- **Proactive but not noisy:** Morning briefing, weekly digest, overdue/stale nudges on a schedule; notification channel (in-app, email, Slack) configurable.
