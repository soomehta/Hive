interface PreviewField {
  label: string;
  value: string;
}

interface ActionPreview {
  title: string;
  fields: PreviewField[];
}

export function getActionPreview(
  actionType: string,
  payload: Record<string, unknown>
): ActionPreview | null {
  switch (actionType) {
    case "create_task":
      return {
        title: "Create Task",
        fields: [
          { label: "Title", value: String(payload.title ?? "") },
          ...(payload.projectId
            ? [{ label: "Project", value: truncateId(payload.projectId as string) }]
            : []),
          ...(payload.priority
            ? [{ label: "Priority", value: capitalize(payload.priority as string) }]
            : []),
          ...(payload.assigneeId
            ? [{ label: "Assignee", value: truncateId(payload.assigneeId as string) }]
            : []),
          ...(payload.dueDate
            ? [{ label: "Due", value: formatPreviewDate(payload.dueDate as string) }]
            : []),
        ],
      };
    case "update_task":
      return {
        title: "Update Task",
        fields: Object.entries(payload)
          .filter(([key]) => key !== "taskId")
          .map(([key, val]) => ({
            label: capitalize(key.replace(/([A-Z])/g, " $1").trim()),
            value: String(val ?? ""),
          })),
      };
    case "create_comment":
      return {
        title: "Add Comment",
        fields: [
          ...(payload.content
            ? [{ label: "Comment", value: truncate(payload.content as string, 120) }]
            : []),
          ...(payload.taskId
            ? [{ label: "On task", value: truncateId(payload.taskId as string) }]
            : []),
        ],
      };
    case "flag_blocker":
      return {
        title: "Flag Blocker",
        fields: [
          ...(payload.description
            ? [{ label: "Blocker", value: truncate(payload.description as string, 120) }]
            : []),
          ...(payload.taskId
            ? [{ label: "Task", value: truncateId(payload.taskId as string) }]
            : []),
        ],
      };
    case "create_channel":
      return {
        title: "Create Channel",
        fields: [
          ...(payload.name ? [{ label: "Name", value: payload.name as string }] : []),
          ...(payload.scope ? [{ label: "Scope", value: payload.scope as string }] : []),
        ],
      };
    case "create_page":
      return {
        title: "Create Page",
        fields: [
          ...(payload.title ? [{ label: "Title", value: payload.title as string }] : []),
        ],
      };
    case "create_notice":
      return {
        title: "Create Notice",
        fields: [
          ...(payload.title ? [{ label: "Title", value: payload.title as string }] : []),
          ...(payload.body
            ? [{ label: "Body", value: truncate(payload.body as string, 80) }]
            : []),
        ],
      };
    default:
      return null;
  }
}

function truncateId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) + "..." : id;
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 3) + "..." : text;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatPreviewDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
