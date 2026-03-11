import { create } from "zustand";

export type CardConfig = {
  id: string;
  label: string;
  visible: boolean;
};

export type Density = "compact" | "comfortable";
export type ThemeKey = "paper_classic" | "blueprint" | "studio" | "minimal";

export const DEFAULT_CARDS: CardConfig[] = [
  { id: "myTasks", label: "My Priority Tasks", visible: true },
  { id: "notices", label: "Team Notices", visible: true },
  { id: "channels", label: "Chat Highlights", visible: true },
  { id: "deadlines", label: "Upcoming Deadlines", visible: true },
  { id: "mentions", label: "Recent Mentions", visible: true },
  { id: "projectPulse", label: "Project Pulse", visible: true },
  { id: "paBriefing", label: "PA Briefing", visible: true },
];

interface PinboardState {
  cards: CardConfig[];
  density: Density;
  theme: ThemeKey;
  showSettings: boolean;
  layoutInitialized: boolean;
  activeLayoutId: string | null;

  setCards: (cards: CardConfig[]) => void;
  setDensity: (density: Density) => void;
  setTheme: (theme: ThemeKey) => void;
  setShowSettings: (show: boolean) => void;
  toggleSettings: () => void;
  setLayoutInitialized: (v: boolean) => void;
  setActiveLayoutId: (id: string | null) => void;
  toggleVisibility: (cardId: string) => void;
  reorderCards: (oldIndex: number, newIndex: number) => void;

  /** Restore layout from persisted JSON */
  restoreLayout: (layoutJson: Record<string, unknown>, theme?: string) => void;
}

export const usePinboardStore = create<PinboardState>((set) => ({
  cards: DEFAULT_CARDS,
  density: "comfortable",
  theme: "paper_classic",
  showSettings: false,
  layoutInitialized: false,
  activeLayoutId: null,

  setCards: (cards) => set({ cards }),
  setDensity: (density) => set({ density }),
  setTheme: (theme) => set({ theme }),
  setShowSettings: (showSettings) => set({ showSettings }),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  setLayoutInitialized: (layoutInitialized) => set({ layoutInitialized }),
  setActiveLayoutId: (activeLayoutId) => set({ activeLayoutId }),

  toggleVisibility: (cardId) =>
    set((s) => ({
      cards: s.cards.map((c) =>
        c.id === cardId ? { ...c, visible: !c.visible } : c
      ),
    })),

  reorderCards: (oldIndex, newIndex) =>
    set((s) => {
      const next = [...s.cards];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return { cards: next };
    }),

  restoreLayout: (layoutJson, theme) => {
    const lj = layoutJson as {
      cardOrder?: string[];
      hiddenCards?: string[];
      density?: Density;
    };
    set((s) => {
      const updates: Partial<PinboardState> = { layoutInitialized: true };
      if (lj.cardOrder) {
        updates.cards = lj.cardOrder.map((id) => ({
          id,
          label: DEFAULT_CARDS.find((c) => c.id === id)?.label ?? id,
          visible: !(lj.hiddenCards ?? []).includes(id),
        }));
      }
      if (lj.density) updates.density = lj.density;
      if (theme) updates.theme = theme as ThemeKey;
      return updates;
    });
  },
}));
