import { Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { createTypedWorker } from "@/lib/queue/create-typed-worker";
import type { NotificationJob } from "@/lib/queue/jobs";
import { createNotification } from "@/lib/notifications/in-app";
import type { Resend } from "resend";
import { resolveUserMeta } from "@/lib/utils/user-resolver";

// ─── Lazy SDK Initialization ────────────────────────────

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const { Resend: ResendClient } = require("resend") as typeof import("resend");
    _resend = new ResendClient(process.env.RESEND_API_KEY!);
  }
  return _resend;
}

// ─── Worker ─────────────────────────────────────────────

const { worker, log } = createTypedWorker<NotificationJob>(
  "notification",
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

    log.info(
      { jobId: job.id, channel, type, userId },
      "Processing notification"
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

    log.info(
      { jobId: job.id, notificationId: notification.id, channel },
      "Notification delivered"
    );

    return { notificationId: notification.id, channel };
  },
  { concurrency: 10 }
);

// ─── Email via Resend ───────────────────────────────────

async function sendEmailNotification(
  userId: string,
  title: string,
  body?: string
) {
  try {
    const userMeta = await resolveUserMeta(userId);
    if (!userMeta.email) {
      log.warn({ userId }, "Skipping email notification: no email found for user");
      return;
    }

    const resend = getResend();
    const fromEmail =
      process.env.EMAIL_FROM ?? "Hive PA <notifications@hive.app>";

    await resend.emails.send({
      from: fromEmail,
      to: userMeta.email,
      subject: title,
      text: body ?? title,
    });

    log.info({ userId, email: userMeta.email, title }, "Email sent");
  } catch (err) {
    log.error({ err, userId }, "Failed to send email");
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

    log.info({ userId }, "Slack message sent");
  } catch (err) {
    log.error({ err, userId }, "Failed to send Slack message");
  }
}

export { worker as notificationWorker };
