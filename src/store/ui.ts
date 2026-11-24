import { create } from 'zustand';
import { loadUi, saveUi } from '@/store/persist';
import type { ThemeName } from '@/ui/theme/tokens';

export type SceneTab = 'plate' | 'door' | 'terminals' | 'preview3d';
export type MainView = 'cabinet' | 'schematic' | 'mixed' | 'editor' | 'tasks';

interface UiState {
  sceneTab: SceneTab;
  view: MainView;
  theme: ThemeName;
  currentTaskId: string | null;
  /** Czy panel lewy (paleta) jest widoczny. Na wąskim ekranie domyślnie false. */
  leftOpen: boolean;
  /** Czy panel prawy (inspektor) jest widoczny. Na wąskim ekranie domyślnie false. */
  rightOpen: boolean;
  setSceneTab(tab: SceneTab): void;
  setView(view: MainView): void;
  setTheme(theme: ThemeName): void;
  setCurrentTaskId(id: string | null): void;
  toggleLeft(): void;
  toggleRight(): void;
  setLeftOpen(open: boolean): void;
  setRightOpen(open: boolean): void;
}

const NARROW_PX = 900;

/** Czy viewport jest wąski (< 900 px) — mobile/tablet w pionie. Bezpieczny w SSR/jsdom. */
const isNarrowViewport = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') {
    const w = window.innerWidth;
    return typeof w === 'number' ? w < NARROW_PX : false;
  }
  return window.matchMedia(`(max-width: ${NARROW_PX - 1}px)`).matches;
};

const initial = loadUi();
const defaultPanelOpen = !isNarrowViewport();

export const useUiStore = create<UiState>((set) => ({
  sceneTab: 'plate',
  view: initial?.view ?? 'tasks',
  theme: initial?.theme ?? 'dark',
  currentTaskId: initial?.currentTaskId ?? null,
  leftOpen: defaultPanelOpen,
  rightOpen: defaultPanelOpen,
  setSceneTab(tab) {
    set({ sceneTab: tab });
  },
  setView(view) {
    set({ view });
  },
  setTheme(theme) {
    set({ theme });
  },
  setCurrentTaskId(id) {
    set({ currentTaskId: id });
  },
  toggleLeft() {
    set((s) => ({ leftOpen: !s.leftOpen }));
  },
  toggleRight() {
    set((s) => ({ rightOpen: !s.rightOpen }));
  },
  setLeftOpen(open) {
    set({ leftOpen: open });
  },
  setRightOpen(open) {
    set({ rightOpen: open });
  },
}));

useUiStore.subscribe((state, prev) => {
  if (state.view === prev.view && state.theme === prev.theme && state.currentTaskId === prev.currentTaskId) {
    return;
  }
  saveUi({ theme: state.theme, view: state.view, currentTaskId: state.currentTaskId });
});
