import { useEffect, useMemo, useState, type FC } from 'react';
import dol4kwRaw from '../../../tasks/examples/dol-4kw.json';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { resolveState, useProjectStore } from '@/store/project';
import { SceneView, ZoomToolbar } from '@/ui/scene';
import { Palette } from '@/ui/components/Palette';

interface Props {
  slot?: 'palette' | 'stage';
}

export const EditorScreen: FC<Props> = ({ slot = 'stage' }) => {
  const init = useProjectStore((s) => s.init);
  const removeDevice = useProjectStore((s) => s.removeDevice);
  const selectedTag = useProjectStore((s) => s.selectedTag);
  const task = useProjectStore((s) => s.task);
  const library = useProjectStore((s) => s.library);
  const devices = useProjectStore((s) => s.devices);
  const wires = useProjectStore((s) => s.wires);
  const [draggingTypeId, setDraggingTypeId] = useState<string | null>(null);

  useEffect(() => {
    if (task && library) return;
    const lib = loadDeviceLibrary();
    const t = loadTask(dol4kwRaw, { devices: lib });
    init(t, lib);
  }, [init, task, library]);

  useEffect(() => {
    if (slot !== 'stage') return;
    const onKey = (e: KeyboardEvent): void => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTag) {
        removeDevice(selectedTag);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedTag, removeDevice, slot]);

  const project = useMemo(() => {
    if (!task || !library) return null;
    return resolveState({ devices, wires, library });
  }, [task, library, devices, wires]);

  if (!task || !library || !project) {
    return <div style={{ color: 'var(--theme-muted)' }}>Ładowanie zadania…</div>;
  }

  if (slot === 'palette') {
    return (
      <Palette
        library={library}
        paletteIds={task.scene.palette ?? []}
        onDragStartType={setDraggingTypeId}
        onDragEndType={() => setDraggingTypeId(null)}
        draggingTypeId={draggingTypeId}
      />
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <SceneView task={task} project={project} />
      <ZoomToolbar />
    </div>
  );
};
