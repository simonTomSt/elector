import { create } from 'zustand';

export type SceneTab = 'plate' | 'door' | 'terminals' | 'preview3d';

interface UiState {
  sceneTab: SceneTab;
  setSceneTab(tab: SceneTab): void;
}

export const useUiStore = create<UiState>((set) => ({
  sceneTab: 'plate',
  setSceneTab(tab) {
    set({ sceneTab: tab });
  },
}));
