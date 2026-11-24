import { create } from 'zustand';

interface HintsState {
  revealedIds: string[];
  used: number;
  reveal(id: string): void;
  reset(): void;
  hydrate(ids: readonly string[]): void;
}

export const useHintsStore = create<HintsState>((set, get) => ({
  revealedIds: [],
  used: 0,
  reveal(id) {
    const { revealedIds } = get();
    if (revealedIds.includes(id)) return;
    const next = [...revealedIds, id];
    set({ revealedIds: next, used: next.length });
  },
  reset() {
    set({ revealedIds: [], used: 0 });
  },
  hydrate(ids) {
    const unique = Array.from(new Set(ids));
    set({ revealedIds: unique, used: unique.length });
  },
}));
