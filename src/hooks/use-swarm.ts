"use client";

import { create } from "zustand";
import { useEffect, useRef } from "react";
import { useOrg } from "@/hooks/use-org";
import type { BeeRun, BeeSignal, BeeHandover, SwarmStatus } from "@/types/bees";

interface SwarmState {
  activeSwarmId: string | null;
  status: SwarmStatus | null;
  runs: BeeRun[];
  signals: BeeSignal[];
  handovers: BeeHandover[];
  result: unknown;
  setActiveSwarm: (swarmId: string | null) => void;
  updateRun: (run: BeeRun) => void;
  updateRunProgress: (data: { runId: string; status: string; statusText: string }) => void;
  addSignal: (signal: BeeSignal) => void;
  addHandover: (handover: BeeHandover) => void;
  setCompleted: (status: SwarmStatus, result: unknown) => void;
  reset: () => void;
}

export const useSwarmStore = create<SwarmState>((set) => ({
  activeSwarmId: null,
  status: null,
  runs: [],
  signals: [],
  handovers: [],
  result: null,

  setActiveSwarm: (swarmId) =>
    set({
      activeSwarmId: swarmId,
      status: swarmId ? "running" : null,
      runs: [],
      signals: [],
      handovers: [],
      result: null,
    }),

  updateRun: (run) =>
    set((state) => {
      const idx = state.runs.findIndex((r) => r.id === run.id);
      if (idx >= 0) {
        const updated = [...state.runs];
        updated[idx] = run;
        return { runs: updated };
      }
      return { runs: [...state.runs, run] };
    }),

  updateRunProgress: (data) =>
    set((state) => ({
      runs: state.runs.map((r) =>
        r.id === data.runId
          ? { ...r, status: data.status as any, statusText: data.statusText }
          : r
      ),
    })),

  addSignal: (signal) =>
    set((state) => ({ signals: [...state.signals, signal] })),

  addHandover: (handover) =>
    set((state) => ({ handovers: [...state.handovers, handover] })),

  setCompleted: (status, result) =>
    set({ status, result }),

  reset: () =>
    set({
      activeSwarmId: null,
      status: null,
      runs: [],
      signals: [],
      handovers: [],
      result: null,
    }),
}));

export function useSwarmSSE(swarmId: string | null) {
  const { orgId } = useOrg();
  const eventSourceRef = useRef<EventSource | null>(null);
  const store = useSwarmStore();

  useEffect(() => {
    if (!swarmId || !orgId) return;

    // Close existing connection
    eventSourceRef.current?.close();

    const url = `/api/bees/swarms/${swarmId}/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("bee_run_status", (e) => {
      try {
        const data = JSON.parse(e.data);
        store.updateRun(data);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("bee_run_progress", (e) => {
      try {
        const data = JSON.parse(e.data);
        store.updateRunProgress(data);
      } catch { /* ignore */ }
    });

    es.addEventListener("bee_signal", (e) => {
      try {
        const data = JSON.parse(e.data);
        store.addSignal(data);
      } catch { /* ignore */ }
    });

    es.addEventListener("bee_handover", (e) => {
      try {
        const data = JSON.parse(e.data);
        store.addHandover(data);
      } catch { /* ignore */ }
    });

    es.addEventListener("swarm_completed", (e) => {
      try {
        const data = JSON.parse(e.data);
        store.setCompleted(data.status, data.result);
      } catch { /* ignore */ }
      es.close();
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swarmId, orgId]);
}
