import type { PAAction } from "@/types/pa";
import { getRegistryEntry } from "./registry";

// Handler imports
import { handleCreateTask } from "./handlers/create-task";
import { handleUpdateTask } from "./handlers/update-task";
import { handleCompleteTask } from "./handlers/complete-task";
import { handleDeleteTask } from "./handlers/delete-task";
import { handleCreateComment } from "./handlers/create-comment";
import { handlePostMessage } from "./handlers/post-message";
import { handleFlagBlocker } from "./handlers/flag-blocker";
import { handleCalendarBlock } from "./handlers/calendar-block";
import { handleCalendarEvent } from "./handlers/calendar-event";
import { handleSendEmail } from "./handlers/send-email";
import { handleSendSlack } from "./handlers/send-slack";
import { handleGenerateReport } from "./handlers/generate-report";
import { handleQuery } from "./handlers/query";

export interface ExecutionResult {
  success: boolean;
  result?: Record<string, any>;
  error?: string;
}

const HANDLER_MAP: Record<string, (action: PAAction) => Promise<ExecutionResult>> = {
  "create-task": handleCreateTask,
  "update-task": handleUpdateTask,
  "complete-task": handleCompleteTask,
  "delete-task": handleDeleteTask,
  "create-comment": handleCreateComment,
  "post-message": handlePostMessage,
  "flag-blocker": handleFlagBlocker,
  "calendar-block": handleCalendarBlock,
  "calendar-event": handleCalendarEvent,
  "send-email": handleSendEmail,
  "send-slack": handleSendSlack,
  "generate-report": handleGenerateReport,
  "query": handleQuery,
};

export async function executeAction(action: PAAction): Promise<ExecutionResult> {
  const entry = getRegistryEntry(action.actionType);
  if (!entry) {
    return { success: false, error: `Unknown action type: ${action.actionType}` };
  }

  const handler = HANDLER_MAP[entry.handler];
  if (!handler) {
    return { success: false, error: `No handler found for: ${entry.handler}` };
  }

  try {
    return await handler(action);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
