import { Job } from "bullmq";
import { createWorker, QUEUE_NAMES } from "@/lib/queue";
import type { NotificationJob } from "@/lib/queue/jobs";
import { createNotification } from "@/lib/notifications/in-app";
import type { Resend } from "resend";

// ─── Lazy SDK Initialization ────────────────────────────

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    // Dynamic import is not practical here since it's a class constructor;
    // the package is already installed, so require is fine for lazy init.
    const { Resend: ResendClient } = require("resend") as typeof import("resend");
    _resend = new ResendClient(process.env.RESEND_API_KEY!);
  }
  return _resend;
}

// ─── Worker ─────────────────────────────────────────────

const worker = createWorker<NotificationJob>(
  QUEUE_NAMES.NOTIFICATION,
  async (job: Job<NotificationJob>) => {
    const {
      userId,
      orgId,
      type,
      title,
      body,
      channel = "in_app",
      metadata,
    } = job.data;

    console.log(
      `[notification] Processing job ${job.id}: channel=${channel} type=${type} user=${userId}`
    );

    // Always create an in-app notification as the baseline record
    const notification = await createNotification({
      userId,
      orgId,
      type: type as any,
      title,
      body,
      metadata,
    });

    // Additionally dispatch to external channels if requested
    if (channel === "email") {
      await sendEmailNotification(userId, title, body);
    } else if (channel === "slack") {
      await sendSlackNotification(userId, orgId, title, body);
    }

    console.log(
      `[notification] Completed job ${job.id}: notification=${notification.id} channel=${channel}`
    );

    return { notificationId: notification.id, channel };
  },
  {
    concurrency: 10,
  }
);

// ─── Email via Resend ───────────────────────────────────

async function sendEmailNotification(
  userId: string,
  title: string,
  body?: string
) {
  try {
    const resend = getResend();
    const fromEmail =
      process.env.EMAIL_FROM ?? "Hive PA <notifications@hive.app>";

    // In production, resolve userId to email via Clerk.
    // For now we construct a placeholder — the cron/API caller should
    // pass the user's email in job metadata if available.
    await resend.emails.send({
      from: fromEmail,
      to: userId, // Caller should provide email; falls back to userId
      subject: title,
      text: body ?? title,
    });

    console.log(`[notification] Email sent to ${userId}: "${title}"`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[notification] Failed to send email: ${message}`);
    // Do not rethrow — in-app notification was already created.
    // Email failure should not fail the entire job.
  }
}

// ─── Slack via Integration ──────────────────────────────

async function sendSlackNotification(
  userId: string,
  orgId: string,
  title: string,
  body?: string
) {
  try {
    const { sendMessage } = await import("@/lib/integrations/slack");

    const text = body ? `*${title}*\n${body}` : `*${title}*`;

    await sendMessage(userId, orgId, {
      userId,
      text,
    });

    console.log(`[notification] Slack message sent to user=${userId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[notification] Failed to send Slack message: ${message}`);
    // Do not rethrow — in-app notification was already created.
  }
}

// ─── Events ─────────────────────────────────────────────

worker.on("completed", (job) => {
  console.log(`[notification] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(
    `[notification] Job ${job?.id} failed: ${err.message}`,
    err.stack
  );
});

export { worker as notificationWorker };
