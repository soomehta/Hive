import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin before importing the module under test
vi.mock("@/lib/supabase/admin", () => {
  const mockSend = vi.fn().mockResolvedValue({});
  const mockRemoveChannel = vi.fn().mockResolvedValue({});
  const mockChannel = vi.fn(() => ({
    send: mockSend,
  }));

  return {
    supabaseAdmin: {
      channel: mockChannel,
      removeChannel: mockRemoveChannel,
    },
  };
});

import { broadcastToUser, broadcastToOrg, sseManager } from "@/lib/notifications/sse";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Access the mocked functions
const mockChannel = vi.mocked(supabaseAdmin.channel);
const mockRemoveChannel = vi.mocked(supabaseAdmin.removeChannel);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Supabase Realtime Notifications", () => {
  it("broadcastToUser creates a user-scoped channel and sends", async () => {
    await broadcastToUser("user-1", "org-1", "notification", { text: "hello" });

    expect(mockChannel).toHaveBeenCalledWith("notifications:org-1:user-1");
    const channelInstance = mockChannel.mock.results[0].value;
    expect(channelInstance.send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "notification",
      payload: { text: "hello" },
    });
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it("broadcastToOrg creates an org-scoped channel and sends", async () => {
    await broadcastToOrg("org-A", "refresh", { scope: "tasks" });

    expect(mockChannel).toHaveBeenCalledWith("notifications:org-A");
    const channelInstance = mockChannel.mock.results[0].value;
    expect(channelInstance.send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "refresh",
      payload: { scope: "tasks" },
    });
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it("broadcastToUser uses correct channel format for different users/orgs", async () => {
    await broadcastToUser("user-2", "org-B", "update", { id: 1 });

    expect(mockChannel).toHaveBeenCalledWith("notifications:org-B:user-2");
  });

  it("sseManager.sendToUser backward-compat shim does not throw", () => {
    expect(() =>
      sseManager.sendToUser("user-1", "org-1", "ping", { ok: true })
    ).not.toThrow();

    expect(mockChannel).toHaveBeenCalledWith("notifications:org-1:user-1");
  });

  it("sseManager.sendToOrg backward-compat shim does not throw", () => {
    expect(() =>
      sseManager.sendToOrg("org-A", "refresh", { scope: "tasks" })
    ).not.toThrow();

    expect(mockChannel).toHaveBeenCalledWith("notifications:org-A");
  });
});
