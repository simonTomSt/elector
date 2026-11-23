import { create } from 'zustand';

export type LotoStep = 'disconnect' | 'lock' | 'verify';

export const LOTO_STEPS: readonly LotoStep[] = ['disconnect', 'lock', 'verify'] as const;

export const LOTO_STEP_LABEL: Record<LotoStep, string> = {
  disconnect: 'Wyłącz zasilanie (-Q0 do 0)',
  lock: 'Zabezpiecz przed ponownym załączeniem (kłódka na -Q0)',
  verify: 'Sprawdź brak napięcia miernikiem na każdej parze faz i faza–PE',
};

export type LotoReason = 'wire' | 'device' | 'terminal';

export interface LotoPrompt {
  reason: LotoReason;
  target: string;
}

interface LotoState {
  prompt: LotoPrompt | null;
  completedSteps: Set<LotoStep>;
  openPrompt(p: LotoPrompt): void;
  closePrompt(): void;
  markStep(step: LotoStep): void;
  resetProcedure(): void;
  isComplete(): boolean;
}

export const useLotoStore = create<LotoState>((set, get) => ({
  prompt: null,
  completedSteps: new Set(),

  openPrompt(p) {
    set({ prompt: p });
  },
  closePrompt() {
    set({ prompt: null });
  },
  markStep(step) {
    set((s) => {
      const next = new Set(s.completedSteps);
      next.add(step);
      return { completedSteps: next };
    });
  },
  resetProcedure() {
    set({ completedSteps: new Set() });
  },
  isComplete() {
    const c = get().completedSteps;
    return LOTO_STEPS.every((s) => c.has(s));
  },
}));

export const isAnyWireLive = (
  wires: Record<string, { live: boolean; short?: boolean }>,
): boolean => Object.values(wires).some((w) => w.live || w.short === true);
