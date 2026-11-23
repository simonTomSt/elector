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
  setSceneTab(tab: SceneTab): void;
  setView(view: MainView): void;
  setTheme(theme: ThemeName): void;
  setCurrentTaskId(id: string | null): void;
}

const initial = loadUi();

export const useUiStore = create<UiState>((set) => ({
  sceneTab: 'plate',
  view: initial?.view ?? 'tasks',
  theme: initial?.theme ?? 'dark',
  currentTaskId: initial?.currentTaskId ?? null,
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
}));

useUiStore.subscribe((state, prev) => {
  if (state.view === prev.view && state.theme === prev.theme && state.currentTaskId === prev.currentTaskId) {
    return;
  }
  saveUi({ theme: state.theme, view: state.view, currentTaskId: state.currentTaskId });
});
