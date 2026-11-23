import { create } from 'zustand';
import type { TerminalRef } from '@/domain/types';
import type { MeterRange, MeterReading } from '@/sim/meter';

export const METER_RANGES: readonly MeterRange[] = [
  'off',
  'vac',
  'vdc',
  'ohm',
  'cont',
  'aac',
] as const;

export interface HistoryEntry {
  t: number;
  reading: MeterReading;
}

interface MeterState {
  open: boolean;
  x: number;
  y: number;
  range: MeterRange;
  probes: [TerminalRef | null, TerminalRef | null];
  pickActive: 0 | 1 | null;
  hold: boolean;
  minmax: boolean;
  rel: boolean;
  relRef: number | null;
  history: HistoryEntry[];
  openPanel(): void;
  closePanel(): void;
  togglePanel(): void;
  setPosition(x: number, y: number): void;
  setRange(r: MeterRange): void;
  cycleRange(dir?: 1 | -1): void;
  attachProbe(idx: 0 | 1, ref: TerminalRef | null): void;
  swapProbes(): void;
  startPick(idx: 0 | 1): void;
  cancelPick(): void;
  pickTerminal(ref: TerminalRef): boolean;
  toggleHold(): void;
  toggleMinMax(): void;
  toggleRel(current: number | null): void;
  recordReading(entry: HistoryEntry): void;
  clearHistory(): void;
}

export const useMeterStore = create<MeterState>((set, get) => ({
  open: false,
  x: 24,
  y: 24,
  range: 'off',
  probes: [null, null],
  pickActive: null,
  hold: false,
  minmax: false,
  rel: false,
  relRef: null,
  history: [],

  openPanel() {
    set({ open: true });
  },
  closePanel() {
    set({ open: false });
  },
  togglePanel() {
    set((s) => ({ open: !s.open }));
  },
  setPosition(x, y) {
    set({ x, y });
  },
  setRange(r) {
    set({ range: r, relRef: null, rel: false });
  },
  cycleRange(dir = 1) {
    const i = METER_RANGES.indexOf(get().range);
    const next = (i + dir + METER_RANGES.length) % METER_RANGES.length;
    const nextRange = METER_RANGES[next];
    if (nextRange) set({ range: nextRange, relRef: null, rel: false });
  },
  attachProbe(idx, ref) {
    set((s) => {
      const probes: [TerminalRef | null, TerminalRef | null] = [...s.probes];
      probes[idx] = ref;
      return { probes };
    });
  },
  swapProbes() {
    set((s) => ({ probes: [s.probes[1], s.probes[0]] }));
  },
  startPick(idx) {
    set({ pickActive: idx });
  },
  cancelPick() {
    set({ pickActive: null });
  },
  pickTerminal(ref) {
    const idx = get().pickActive;
    if (idx === null) return false;
    get().attachProbe(idx, ref);
    set({ pickActive: null });
    return true;
  },
  toggleHold() {
    set((s) => ({ hold: !s.hold }));
  },
  toggleMinMax() {
    set((s) => ({ minmax: !s.minmax }));
  },
  toggleRel(current) {
    set((s) => {
      if (s.rel) return { rel: false, relRef: null };
      return { rel: true, relRef: typeof current === 'number' ? current : null };
    });
  },
  recordReading(entry) {
    set((s) => ({ history: [...s.history.slice(-49), entry] }));
  },
  clearHistory() {
    set({ history: [] });
  },
}));
