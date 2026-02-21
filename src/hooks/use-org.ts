"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface OrgState {
  orgId: string | null;
  orgName: string | null;
  setOrg: (orgId: string, orgName: string) => void;
  clearOrg: () => void;
}

export const useOrg = create<OrgState>()(
  persist(
    (set) => ({
      orgId: null,
      orgName: null,
      setOrg: (orgId, orgName) => set({ orgId, orgName }),
      clearOrg: () => set({ orgId: null, orgName: null }),
    }),
    {
      name: "hive-org",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
