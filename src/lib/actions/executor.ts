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
import { handleCalendarReschedule } from "./handlers/calendar-reschedule";
import { handleSendEmail } from "./handlers/send-email";
import { handleSendSlack } from "./handlers/send-slack";
import { handleGenerateReport } from "./handlers/generate-report";
import { handleQuery } from "./handlers/query";
import { handleCreatePage } from "./handlers/create-page";
import { handleUpdatePage } from "./handlers/update-page";
import { handleLinkItems } from "./handlers/link-items";
import { handleUnlinkItems } from "./handlers/unlink-items";
import { handleCreateNotice } from "./handlers/create-notice";
import { handleCreateChannel } from "./handlers/create-channel";
import { handlePostChannelMessage } from "./handlers/post-channel-message";
import { handleSummarizePage } from "./handlers/summarize-page";
import { handleConvertMessageToTask } from "./handlers/convert-message-to-task";
import { handleConvertMessageToPage } from "./handlers/convert-message-to-page";
import { handlePinMessage } from "./handlers/pin-message";
import { handleArchiveChannel } from "./handlers/archive-channel";
import { handleSearchMessages } from "./handlers/search-messages";
import { handleExtractTasks } from "./handlers/extract-tasks";

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
  "calendar-reschedule": handleCalendarReschedule,
  "send-email": handleSendEmail,
  "send-slack": handleSendSlack,
  "generate-report": handleGenerateReport,
  "query": handleQuery,
  "create-page": handleCreatePage,
  "update-page": handleUpdatePage,
  "link-items": handleLinkItems,
  "unlink-items": handleUnlinkItems,
  "create-notice": handleCreateNotice,
  "create-channel": handleCreateChannel,
  "post-channel-message": handlePostChannelMessage,
  "summarize-page": handleSummarizePage,
  "convert-message-to-task": handleConvertMessageToTask,
  "convert-message-to-page": handleConvertMessageToPage,
  "pin-message": handlePinMessage,
  "archive-channel": handleArchiveChannel,
  "search-messages": handleSearchMessages,
  "extract-tasks": handleExtractTasks,
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
