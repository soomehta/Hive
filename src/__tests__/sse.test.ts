import { describe, it, expect, vi, beforeEach } from "vitest";
import { sseManager } from "@/lib/notifications/sse";

// ---------- Helpers --------------------------------------------------------

/** Creates a mock ReadableStreamDefaultController */
function createMockController() {
  return {
    enqueue: vi.fn(),
    close: vi.fn(),
  } as unknown as ReadableStreamDefaultController;
}

// Between tests we need to clear the singleton's internal client map.
// Because SSEManager.clients is private, we remove clients by calling
// removeClient for every id we registered.
let registeredIds: string[] = [];

beforeEach(() => {
  // Clean up clients from previous test
  for (const id of registeredIds) {
    sseManager.removeClient(id);
  }
  registeredIds = [];
});

function addTrackedClient(
  id: string,
  controller: ReturnType<typeof createMockController>,
  userId: string,
  orgId: string
) {
  registeredIds.push(id);
  sseManager.addClient(
    id,
    controller as unknown as ReadableStreamDefaultController,
    userId,
    orgId
  );
}

// ---------- Tests ----------------------------------------------------------

describe("SSEManager", () => {
  it("delivers a message to a matching user+org client", () => {
    const ctrl = createMockController();
    addTrackedClient("c1", ctrl, "user-1", "org-1");

    sseManager.sendToUser("user-1", "org-1", "notification", {
      text: "hello",
    });

    expect(ctrl.enqueue).toHaveBeenCalledTimes(1);

    // Verify the SSE format: "event: ...\ndata: ...\n\n"
    const encoded: Uint8Array = (ctrl.enqueue as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    const decoded = new TextDecoder().decode(encoded);
    expect(decoded).toContain("event: notification");
    expect(decoded).toContain('"text":"hello"');
  });

  it("sendToUser only targets the correct user and org", () => {
    const ctrlA = createMockController();
    const ctrlB = createMockController();
    const ctrlC = createMockController();

    addTrackedClient("a", ctrlA, "user-1", "org-1");
    addTrackedClient("b", ctrlB, "user-2", "org-1"); // wrong user
    addTrackedClient("c", ctrlC, "user-1", "org-2"); // wrong org

    sseManager.sendToUser("user-1", "org-1", "update", { id: 1 });

    expect(ctrlA.enqueue).toHaveBeenCalledTimes(1);
    expect(ctrlB.enqueue).not.toHaveBeenCalled();
    expect(ctrlC.enqueue).not.toHaveBeenCalled();
  });

  it("sendToOrg broadcasts to all clients in the same org", () => {
    const ctrl1 = createMockController();
    const ctrl2 = createMockController();
    const ctrlOther = createMockController();

    addTrackedClient("x1", ctrl1, "user-1", "org-A");
    addTrackedClient("x2", ctrl2, "user-2", "org-A");
    addTrackedClient("x3", ctrlOther, "user-3", "org-B");

    sseManager.sendToOrg("org-A", "refresh", { scope: "tasks" });

    expect(ctrl1.enqueue).toHaveBeenCalledTimes(1);
    expect(ctrl2.enqueue).toHaveBeenCalledTimes(1);
    expect(ctrlOther.enqueue).not.toHaveBeenCalled();
  });

  it("removeClient stops delivery to that client", () => {
    const ctrl = createMockController();
    addTrackedClient("rm-1", ctrl, "user-1", "org-1");

    // First send succeeds
    sseManager.sendToUser("user-1", "org-1", "ping", {});
    expect(ctrl.enqueue).toHaveBeenCalledTimes(1);

    // Remove and send again
    sseManager.removeClient("rm-1");
    // Also remove from our tracked list so beforeEach doesn't double-remove
    registeredIds = registeredIds.filter((id) => id !== "rm-1");

    sseManager.sendToUser("user-1", "org-1", "ping", {});
    // Still only 1 call total
    expect(ctrl.enqueue).toHaveBeenCalledTimes(1);
  });

  it("does not crash when a client controller throws on enqueue", () => {
    const badCtrl = createMockController();
    (badCtrl.enqueue as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("stream closed");
    });
    addTrackedClient("bad-1", badCtrl, "user-1", "org-1");

    // Should not throw
    expect(() =>
      sseManager.sendToUser("user-1", "org-1", "test", { ok: true })
    ).not.toThrow();
  });

  it("handles sending to a user with no connected clients gracefully", () => {
    // No clients registered at all — should be a no-op
    expect(() =>
      sseManager.sendToUser("ghost", "org-1", "ping", {})
    ).not.toThrow();
  });
});
