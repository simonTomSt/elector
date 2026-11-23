import { useEffect, useMemo, useState, type FC } from 'react';
import dol4kwRaw from '../../../tasks/examples/dol-4kw.json';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { resolveState, useProjectStore } from '@/store/project';
import { SceneView, ZoomToolbar } from '@/ui/scene';
import { SpoolToolbar } from '@/ui/scene/SpoolToolbar';
import { Palette } from '@/ui/components/Palette';
import { DoorView } from '@/ui/scene/DoorView';
import { useUiStore } from '@/store/ui';
import { useSimStore } from '@/store/sim';
import { isAnyWireLive, useLotoStore } from '@/store/loto';

interface Props {
  slot?: 'palette' | 'stage';
}

export const EditorScreen: FC<Props> = ({ slot = 'stage' }) => {
  const init = useProjectStore((s) => s.init);
  const removeDevice = useProjectStore((s) => s.removeDevice);
  const removeWire = useProjectStore((s) => s.removeWire);
  const selectedTag = useProjectStore((s) => s.selectedTag);
  const selectedWireId = useProjectStore((s) => s.selectedWireId);
  const task = useProjectStore((s) => s.task);
  const library = useProjectStore((s) => s.library);
  const devices = useProjectStore((s) => s.devices);
  const wires = useProjectStore((s) => s.wires);
  const [draggingTypeId, setDraggingTypeId] = useState<string | null>(null);
  const sceneTab = useUiStore((s) => s.sceneTab);
  const simOn = useSimStore((s) => s.on);
  const wireRuntime = useSimStore((s) => s.view.wires);
  const openLotoPrompt = useLotoStore((s) => s.openPrompt);

  useEffect(() => {
    if (task && library) return;
    const lib = loadDeviceLibrary();
    const t = loadTask(dol4kwRaw, { devices: lib });
    init(t, lib);
  }, [init, task, library]);

  useEffect(() => {
    if (slot !== 'stage') return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (simOn && isAnyWireLive(wireRuntime)) {
          const target = selectedWireId ?? selectedTag;
          if (target) {
            openLotoPrompt({
              reason: selectedWireId ? 'wire' : 'device',
              target,
            });
          }
          return;
        }
        if (selectedWireId) {
          removeWire(selectedWireId);
          return;
        }
        if (selectedTag) removeDevice(selectedTag);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    selectedTag,
    selectedWireId,
    removeDevice,
    removeWire,
    slot,
    simOn,
    wireRuntime,
    openLotoPrompt,
  ]);

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
      {sceneTab === 'door' ? (
        <DoorView project={project} />
      ) : (
        <>
          <SceneView task={task} project={project} />
          <SpoolToolbar />
          <ZoomToolbar />
        </>
      )}
    </div>
  );
};
