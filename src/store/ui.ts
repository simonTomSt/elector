import { create } from 'zustand';

export type SceneTab = 'plate' | 'door' | 'terminals' | 'preview3d';
export type MainView = 'cabinet' | 'schematic' | 'mixed' | 'editor';

interface UiState {
  sceneTab: SceneTab;
  view: MainView;
  setSceneTab(tab: SceneTab): void;
  setView(view: MainView): void;
}

export const useUiStore = create<UiState>((set) => ({
  sceneTab: 'plate',
  view: 'cabinet',
  setSceneTab(tab) {
    set({ sceneTab: tab });
  },
  setView(view) {
    set({ view });
  },
}));
