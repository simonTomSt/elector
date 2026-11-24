import { useProjectStore } from '@/store/project';
import type { Task } from '@/domain/types';
import type { DeviceLibrary } from '@/tasks/devices';

/**
 * Inicjalizuje store'a scenariuszem i dociąga rozwiązanie wzorcowe,
 * tak jak robiły to testy sprzed M16 (gdy `init` samo mergeowało solution).
 */
export const initWithSolution = (task: Task, library: DeviceLibrary): void => {
  useProjectStore.getState().init(task, library);
  const solution = task.solution;
  if (!solution) return;
  const state = useProjectStore.getState();
  useProjectStore.setState({
    devices: [...state.devices, ...solution.devices],
    wires: [...state.wires, ...solution.wires],
  });
};
