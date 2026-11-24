import { useProjectStore } from '@/store/project';
import { useUiStore } from '@/store/ui';
import { useHintsStore } from '@/store/hints';
import { useLotoStore } from '@/store/loto';

interface ElectorBridge {
  loadSolution(): { ok: boolean };
  clearToPreset(): { ok: boolean };
  setView(view: 'cabinet' | 'schematic' | 'mixed' | 'editor' | 'tasks'): void;
  openTask(taskId: string): void;
  resetStores(): void;
}

declare global {
  interface Window {
    __elector?: ElectorBridge;
  }
}

export const installE2eBridge = (): void => {
  if (typeof window === 'undefined') return;
  if (!import.meta.env.DEV) return;

  window.__elector = {
    loadSolution() {
      const { task, library } = useProjectStore.getState();
      if (!task || !library || !task.solution) return { ok: false };
      const preset = task.scene.preset;
      const devices = [
        ...(preset?.devices ?? []),
        ...task.solution.devices,
      ];
      const wires = [...(preset?.wires ?? []), ...task.solution.wires];
      useProjectStore.setState({
        devices,
        wires,
        selectedTag: null,
        selectedWireId: null,
      });
      return { ok: true };
    },
    clearToPreset() {
      const { task } = useProjectStore.getState();
      if (!task) return { ok: false };
      const preset = task.scene.preset;
      useProjectStore.setState({
        devices: [...(preset?.devices ?? [])],
        wires: [...(preset?.wires ?? [])],
        selectedTag: null,
        selectedWireId: null,
      });
      return { ok: true };
    },
    setView(view) {
      useUiStore.getState().setView(view);
    },
    openTask(taskId) {
      useUiStore.getState().setCurrentTaskId(taskId);
      useUiStore.getState().setView('cabinet');
    },
    resetStores() {
      useHintsStore.getState().reset();
      useLotoStore.setState({ incidentCount: 0, completedSteps: new Set(), prompt: null });
      window.localStorage.clear();
    },
  };
};
