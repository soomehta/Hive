import { describe, it, expect } from "vitest";
import { hasPermission } from "@/lib/auth/permissions";
import { getActivityDescription } from "@/lib/utils/activity-descriptions";
import { getTaskTimeGroup } from "@/lib/utils/dates";

describe("permissions", () => {
  it("owner has org:manage", () => {
    expect(hasPermission("owner", "org:manage")).toBe(true);
  });

  it("member does not have org:manage", () => {
    expect(hasPermission("member", "org:manage")).toBe(false);
  });

  it("admin can invite", () => {
    expect(hasPermission("admin", "org:invite")).toBe(true);
  });

  it("member can create projects", () => {
    expect(hasPermission("member", "project:create")).toBe(true);
  });

  it("member with project lead context can manage project", () => {
    expect(
      hasPermission("member", "project:manage", { isProjectLead: true })
    ).toBe(true);
  });

  it("member without context cannot manage project", () => {
    expect(hasPermission("member", "project:manage")).toBe(false);
  });
});

describe("activity descriptions", () => {
  it("describes task creation", () => {
    const desc = getActivityDescription("task_created", {
      taskTitle: "Fix bug",
    });
    expect(desc).toContain("Fix bug");
    expect(desc).toContain("created");
  });

  it("describes status change", () => {
    const desc = getActivityDescription("task_updated", {
      taskTitle: "Deploy",
      oldStatus: "todo",
      newStatus: "in_progress",
    });
    expect(desc).toContain("todo");
    expect(desc).toContain("in_progress");
  });

  it("handles missing metadata", () => {
    const desc = getActivityDescription("task_created", null);
    expect(desc).toContain("Untitled");
  });
});

describe("date utilities", () => {
  it("returns no_date for null", () => {
    expect(getTaskTimeGroup(null)).toBe("no_date");
  });

  it("returns today for today's date", () => {
    expect(getTaskTimeGroup(new Date())).toBe("today");
  });
});
