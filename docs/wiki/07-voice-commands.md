# Voice Commands

Hive is voice-first — every action you can perform by typing can also be done by speaking. This guide covers how to use voice input with your PA.

---

## 1. How Voice Input Works

Voice input uses a two-step process:

1. **Recording** — you speak into your device's microphone
2. **Transcription** — your audio is converted to text using Deepgram Nova-3 (with Gladia Solaria as a fallback)
3. **Processing** — the transcribed text is sent to the PA for intent classification and action, exactly like a typed message

---

## 2. Starting a Voice Recording

1. Open the PA panel.
2. Click the **microphone button** at the bottom of the chat input.
3. Your browser may ask for **microphone permission** — click "Allow."
4. The UI switches to **recording mode**:

```
+----------------------------------+
|  [Stop]  |||||||||||  0:04       |   <- recording with waveform
+----------------------------------+
```

5. Speak your request clearly and naturally.
6. Click the **Stop button** to finish recording.

### Recording States

| State | What You See |
|-------|-------------|
| **Idle** | Microphone icon with "Tap to speak to your PA" |
| **Recording** | Stop button, animated waveform, elapsed time |
| **Processing** | Spinner with "Transcribing..." |
| **Complete** | Your transcribed text appears as a sent message |

---

## 3. Automatic Stop

Voice recording includes two automatic stop safeguards:

- **Maximum duration** — recording auto-stops after **2 minutes** (configurable)
- **Silence detection** — recording auto-stops after **3 seconds of silence** (configurable)

This prevents accidentally leaving the microphone on.

---

## 4. Custom Vocabulary

Hive automatically improves transcription accuracy by passing your workspace context to the transcription engine:

- **Project names** from your organization
- **Team member names**
- **Common domain terms**

This means names like "Project Phoenix" or "Sarah Chen" are transcribed correctly even in noisy audio.

---

## 5. Supported Audio Formats

Voice recording uses your browser's native audio capabilities:

| Browser | Format |
|---------|--------|
| Chrome, Firefox | WebM/Opus |
| Safari | MP4/AAC |

All formats are supported by the transcription service. No configuration needed on your part.

---

## 6. Language Support

The transcription service auto-detects the language you're speaking. It supports:

- English (best accuracy)
- Spanish, French, German, Portuguese, and many more
- You can set language preferences in your [PA profile](./17-pa-profile-and-preferences.md) to improve accuracy

If you primarily speak a non-English language, setting it as your primary language in PA settings helps the transcription engine prioritize that language model.

---

## 7. Confidence and Fallback

After transcription:

- If the **confidence score is above 0.7**, the transcript is used directly.
- If the confidence is **below 0.7**, Hive automatically retries with the fallback transcription engine (Gladia Solaria) for better accuracy.
- The transcript is stored for debugging purposes.

If the transcription doesn't look right, you can:
1. See the transcribed text in the chat
2. Correct it by typing a follow-up: "I meant to say..."
3. Try recording again in a quieter environment

---

## 8. Tips for Best Voice Recognition

1. **Speak clearly and at a natural pace** — no need to speak slowly, but avoid mumbling
2. **Use a quiet environment** — background noise reduces accuracy
3. **Say names clearly** — "Assign to Sarah Chen" works better than "assign to, uh, Sarah"
4. **Use full sentences** — "Create a task called review the design docs and assign it to Alex" works better than just "review design docs Alex"
5. **Pause between requests** — if you want multiple actions, pause between each one or make separate recordings

---

## 9. Example Voice Commands

Here are things you can say to your PA:

### Task Management
- "Create a task in the Mobile App project: Implement push notifications, high priority, due next Friday"
- "What are my tasks for today?"
- "Mark the design review task as done"
- "I'm blocked on the API integration, waiting for the third-party credentials"

### Calendar & Scheduling
- "What's on my calendar today?"
- "Block two hours tomorrow morning for focused coding"
- "Schedule a meeting with Sarah and Alex for Thursday at 2 PM, thirty minutes"

### Communication
- "Post a message in Design Sprint: We're going with option A for the navigation redesign"
- "Send an email to the client with a project update"
- "Send a Slack message to the engineering channel: Deploy is scheduled for 3 PM"

### Reports & Information
- "How's the Website Redesign project going?"
- "Give me a weekly summary of the team's progress"
- "What's at risk this sprint?"
- "Who's overloaded right now?"

### Quick Queries
- "Do I have any unread emails?"
- "What's blocked in the Mobile App project?"
- "When is the next meeting?"

---

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| Microphone not working | Check browser permissions — click the lock icon in the URL bar and ensure microphone access is allowed |
| Poor transcription quality | Move to a quieter environment; speak closer to the microphone |
| Wrong language detected | Set your primary language in [PA settings](./17-pa-profile-and-preferences.md) |
| Recording stops immediately | Silence detection may be triggering — try speaking as soon as you click record |
| "Transcribing..." hangs | Check your internet connection; try refreshing the page |

---

## Next Steps

- **[Actions & Approvals](./08-actions-and-approvals.md)** — what happens after the PA processes your request
- **[Autonomy Settings](./09-autonomy-settings.md)** — control when the PA asks for approval
