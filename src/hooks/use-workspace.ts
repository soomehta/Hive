"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceState {
  activeWorkspaceId: string | null;
  activeWorkspaceName: string | null;
  setWorkspace: (id: string, name: string) => void;
  clearWorkspace: () => void;
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      activeWorkspaceName: null,
      setWorkspace: (id, name) =>
        set({ activeWorkspaceId: id, activeWorkspaceName: name }),
      clearWorkspace: () =>
        set({ activeWorkspaceId: null, activeWorkspaceName: null }),
    }),
    {
      name: "hive-workspace",
    }
  )
);
