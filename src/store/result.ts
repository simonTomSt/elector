import { create } from 'zustand';
import type { Score } from '@/validation/scoring';

interface ResultState {
  result: Score | null;
  open: boolean;
  setResult(score: Score): void;
  show(): void;
  hide(): void;
}

export const useResultStore = create<ResultState>((set) => ({
  result: null,
  open: false,
  setResult(score) {
    set({ result: score, open: true });
  },
  show() {
    set({ open: true });
  },
  hide() {
    set({ open: false });
  },
}));
