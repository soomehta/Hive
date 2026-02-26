import type { InferSelectModel } from "drizzle-orm";
import type {
  organizations,
  organizationMembers,
  invitations,
  projects,
  projectMembers,
  tasks,
  taskComments,
  messages,
  activityLog,
  notifications,
  files,
} from "@/lib/db/schema";

export type Organization = InferSelectModel<typeof organizations>;
export type OrganizationMember = InferSelectModel<typeof organizationMembers>;
export type Invitation = InferSelectModel<typeof invitations>;
export type Project = InferSelectModel<typeof projects>;
export type ProjectMember = InferSelectModel<typeof projectMembers>;
export type Task = InferSelectModel<typeof tasks>;
export type TaskComment = InferSelectModel<typeof taskComments>;
export type Message = InferSelectModel<typeof messages>;
export type ActivityLogEntry = InferSelectModel<typeof activityLog>;
export type Notification = InferSelectModel<typeof notifications>;
export type FileRecord = InferSelectModel<typeof files>;
