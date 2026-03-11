/**
 * Check-in scheduling algorithm.
 * Determines when to send check-ins based on task priority, deadline, and user preferences.
 */

interface ScheduleInput {
  taskId: string;
  assigneeUserId: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  dueDate: Date | null;
  lastCheckinAt: Date | null;
  preferences: {
    frequency: "daily" | "standard" | "minimal" | "off";
    preferredTime: string; // "HH:mm"
    quietHoursStart: string;
    quietHoursEnd: string;
    maxCheckinsPerDay: number;
  };
  checkinsToday: number;
}

interface ScheduleResult {
  shouldCheckin: boolean;
  scheduledAt: Date | null;
  reason: string;
}

/**
 * Determine if and when a check-in should be sent for a task.
 */
export function shouldScheduleCheckin(input: ScheduleInput): ScheduleResult {
  const { priority, status, dueDate, lastCheckinAt, preferences, checkinsToday } = input;

  // Skip done/cancelled tasks
  if (status === "done" || status === "cancelled") {
    return { shouldCheckin: false, scheduledAt: null, reason: "task_completed" };
  }

  // Respect user preference: off means no check-ins
  if (preferences.frequency === "off") {
    return { shouldCheckin: false, scheduledAt: null, reason: "user_opted_out" };
  }

  // Respect max per day
  if (checkinsToday >= preferences.maxCheckinsPerDay) {
    return { shouldCheckin: false, scheduledAt: null, reason: "daily_limit_reached" };
  }

  const now = new Date();
  const hoursUntilDue = dueDate ? (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60) : Infinity;
  const hoursSinceLastCheckin = lastCheckinAt
    ? (now.getTime() - lastCheckinAt.getTime()) / (1000 * 60 * 60)
    : Infinity;

  let shouldSend = false;
  let reason = "";

  if (priority === "urgent" || hoursUntilDue <= 24) {
    // Urgent: immediate if no recent check-in (>4h)
    shouldSend = hoursSinceLastCheckin > 4;
    reason = shouldSend ? "urgent_or_due_soon" : "recent_checkin_exists";
  } else if (priority === "high" || hoursUntilDue <= 72) {
    // High: daily
    shouldSend = hoursSinceLastCheckin > 20;
    reason = shouldSend ? "high_priority_daily" : "recent_checkin_exists";
  } else if (hoursUntilDue <= 168) {
    // Medium (due ≤7 days): at 50% and 80% of remaining time
    if (dueDate) {
      const totalHours = hoursUntilDue + hoursSinceLastCheckin;
      const elapsed = totalHours > 0 ? (1 - hoursUntilDue / totalHours) : 0;
      shouldSend = (elapsed >= 0.5 && hoursSinceLastCheckin > 20) ||
                   (elapsed >= 0.8 && hoursSinceLastCheckin > 12);
      reason = shouldSend ? "medium_milestone" : "not_at_milestone";
    } else {
      shouldSend = hoursSinceLastCheckin > 48;
      reason = shouldSend ? "standard_interval" : "recent_checkin_exists";
    }
  } else {
    // Standard (due 7+ days): weekly, increasing as deadline approaches
    const interval = preferences.frequency === "minimal" ? 168 : // weekly
                     preferences.frequency === "daily" ? 20 :    // daily
                     72;                                          // standard: every 3 days
    shouldSend = hoursSinceLastCheckin > interval;
    reason = shouldSend ? "standard_schedule" : "recent_checkin_exists";
  }

  if (!shouldSend) {
    return { shouldCheckin: false, scheduledAt: null, reason };
  }

  // Schedule at user's preferred time, respecting quiet hours
  const scheduledAt = getNextAvailableTime(preferences.preferredTime, preferences.quietHoursStart, preferences.quietHoursEnd);

  return { shouldCheckin: true, scheduledAt, reason };
}

function getNextAvailableTime(
  preferredTime: string,
  quietStart: string,
  quietEnd: string
): Date {
  const now = new Date();
  const [prefH, prefM] = preferredTime.split(":").map(Number);

  const candidate = new Date(now);
  candidate.setHours(prefH, prefM, 0, 0);

  // If preferred time already passed today, schedule for tomorrow
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }

  // Check if candidate falls in quiet hours
  const [qsH, qsM] = quietStart.split(":").map(Number);
  const [qeH, qeM] = quietEnd.split(":").map(Number);
  const candMinutes = candidate.getHours() * 60 + candidate.getMinutes();
  const qsMinutes = qsH * 60 + qsM;
  const qeMinutes = qeH * 60 + qeM;

  if (qsMinutes > qeMinutes) {
    // Quiet hours span midnight (e.g., 18:00-08:00)
    if (candMinutes >= qsMinutes || candMinutes < qeMinutes) {
      // In quiet hours — push to quiet end
      candidate.setHours(qeH, qeM, 0, 0);
      if (candidate <= now) {
        candidate.setDate(candidate.getDate() + 1);
      }
    }
  } else {
    // Normal range (e.g., 22:00-06:00 wouldn't happen but handle it)
    if (candMinutes >= qsMinutes && candMinutes < qeMinutes) {
      candidate.setHours(qeH, qeM, 0, 0);
      if (candidate <= now) {
        candidate.setDate(candidate.getDate() + 1);
      }
    }
  }

  return candidate;
}
