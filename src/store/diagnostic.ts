import { create } from 'zustand';
import type { DeviceFaultKind, Fault, Task } from '@/domain/types';

export const pickFaults = (
  faults: readonly Fault[],
  n: number,
  rnd: () => number = Math.random,
): Fault[] => {
  if (n <= 0 || faults.length === 0) return [];
  const pool = [...faults];
  const picked: Fault[] = [];
  for (let i = 0; i < Math.min(n, faults.length); i += 1) {
    const idx = Math.floor(rnd() * pool.length);
    const safeIdx = Math.max(0, Math.min(pool.length - 1, idx));
    const chosen = pool.splice(safeIdx, 1)[0];
    if (chosen) picked.push(chosen);
  }
  return picked;
};

export interface ReportResult {
  correct: boolean;
  assigned: readonly string[];
  reported: readonly string[];
}

interface DiagnosticState {
  /** Id usterek wylosowanych dla bieżącego zadania. */
  assignedFaultIds: string[];
  /** Id usterek zgłoszonych przez kursanta (ostatnia próba). */
  reportedFaultIds: string[];
  /** Czy użytkownik już zgłosił usterkę w tej sesji — lockout po pierwszej próbie. */
  reportedAt: number | null;

  assignForTask(task: Task, rnd?: () => number): void;
  report(faultIds: readonly string[]): ReportResult;
  hydrate(partial: Partial<Pick<DiagnosticState, 'assignedFaultIds' | 'reportedFaultIds' | 'reportedAt'>>): void;
  reset(): void;
  deviceFaultStates(
    task: Task,
  ): Record<
    string,
    { tripped?: boolean; coilOpen?: boolean; contactsWelded?: boolean; contactsOpen?: boolean }
  >;
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
};

export const useDiagnosticStore = create<DiagnosticState>((set, get) => ({
  assignedFaultIds: [],
  reportedFaultIds: [],
  reportedAt: null,

  assignForTask(task, rnd = Math.random) {
    if (task.type !== 'diagnostic') return;
    const faults = task.faults ?? [];
    const n = task.pickFaults ?? 0;
    if (faults.length === 0 || n <= 0) return;
    const picked = pickFaults(faults, n, rnd);
    set({
      assignedFaultIds: picked.map((f) => f.id),
      reportedFaultIds: [],
      reportedAt: null,
    });
  },

  report(faultIds) {
    const assigned = get().assignedFaultIds;
    const reported = [...faultIds];
    const correct = sameSet(assigned, reported);
    set({ reportedFaultIds: reported, reportedAt: Date.now() });
    return { correct, assigned, reported };
  },

  hydrate(partial) {
    set((s) => ({
      assignedFaultIds: partial.assignedFaultIds ? [...partial.assignedFaultIds] : s.assignedFaultIds,
      reportedFaultIds: partial.reportedFaultIds ? [...partial.reportedFaultIds] : s.reportedFaultIds,
      reportedAt: partial.reportedAt !== undefined ? partial.reportedAt : s.reportedAt,
    }));
  },

  reset() {
    set({ assignedFaultIds: [], reportedFaultIds: [], reportedAt: null });
  },

  deviceFaultStates(task) {
    const out: Record<
      string,
      { tripped?: boolean; coilOpen?: boolean; contactsWelded?: boolean; contactsOpen?: boolean }
    > = {};
    const assigned = get().assignedFaultIds;
    for (const id of assigned) {
      const f = (task.faults ?? []).find((x) => x.id === id);
      if (!f) continue;
      if (!f.apply.device || !f.apply.deviceFault) continue;
      const tag = f.apply.device;
      const kind: DeviceFaultKind = f.apply.deviceFault;
      const curr = out[tag] ?? {};
      if (kind === 'tripped') curr.tripped = true;
      if (kind === 'coilOpen') curr.coilOpen = true;
      if (kind === 'contactWelded') curr.contactsWelded = true;
      if (kind === 'contactOpen') curr.contactsOpen = true;
      out[tag] = curr;
    }
    return out;
  },
}));
