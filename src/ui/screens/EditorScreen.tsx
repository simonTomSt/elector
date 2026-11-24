import { useEffect, useMemo, useState, type FC } from 'react';
import dol4kwRaw from '../../../tasks/examples/dol-4kw.json';
import diagNoStartRaw from '../../../tasks/examples/diag-no-start.json';
import dolMixedRaw from '../../../tasks/examples/dol-mixed.json';
import dolSchematicRaw from '../../../tasks/examples/dol-schematic.json';
import diagContactStuckRaw from '../../../tasks/examples/diag-contact-stuck.json';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTaskRepo } from '@/tasks/loader';
import { resolveState, useProjectStore } from '@/store/project';
import { SceneView, ZoomToolbar } from '@/ui/scene';
import { SpoolToolbar } from '@/ui/scene/SpoolToolbar';
import { Palette } from '@/ui/components/Palette';
import { DoorView } from '@/ui/scene/DoorView';
import { useUiStore } from '@/store/ui';
import { useSimStore } from '@/store/sim';
import { isAnyWireLive, useLotoStore } from '@/store/loto';
import { clearProject, loadProgress, saveProgress } from '@/store/persist';

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
  const currentTaskId = useUiStore((s) => s.currentTaskId);
  const simOn = useSimStore((s) => s.on);
  const wireRuntime = useSimStore((s) => s.view.wires);
  const openLotoPrompt = useLotoStore((s) => s.openPrompt);

  useEffect(() => {
    const id = currentTaskId ?? 'dol-4kw';
    if (task?.id === id && library) return;
    const lib = loadDeviceLibrary();
    // Użyj repo, bo zadania mogą dziedziczyć (np. diag-no-start extends dol-4kw)
    const { byId } = loadTaskRepo(
      [dol4kwRaw, diagNoStartRaw, diagContactStuckRaw, dolMixedRaw, dolSchematicRaw],
      lib,
    );
    const t = byId.get(id) ?? byId.get('dol-4kw');
    if (!t) return;
    init(t, lib);
  }, [init, task, library, currentTaskId]);

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
      <ResumeBanner taskId={task.id} />
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

const ResumeBanner: FC<{ taskId: string }> = ({ taskId }) => {
  const [dismissed, setDismissed] = useState(false);
  const reinit = useProjectStore((s) => s.init);
  const task = useProjectStore((s) => s.task);
  const library = useProjectStore((s) => s.library);
  const entry = loadProgress()[taskId];
  if (dismissed || !entry || entry.status === 'nie-zaczete') return null;
  const when = new Date(entry.updatedAt);
  const label = when.toLocaleString('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const reset = (): void => {
    clearProject(taskId);
    const p = loadProgress();
    const rest = { ...p };
    delete rest[taskId];
    saveProgress(rest);
    if (task && library) reinit(task, library);
    setDismissed(true);
  };
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
        padding: '8px 12px',
        background: 'var(--theme-panel)',
        border: '1px solid var(--theme-border)',
        borderRadius: 6,
        color: 'var(--theme-fg)',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 10,
      }}
    >
      <span>Wznowiono zapis z {label}.</span>
      <button
        type="button"
        onClick={reset}
        style={{
          background: 'transparent',
          border: '1px solid var(--theme-border)',
          color: 'var(--theme-fg)',
          borderRadius: 4,
          padding: '2px 8px',
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        Zacznij od nowa
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Schowaj komunikat"
        style={{
          marginLeft: 'auto',
          background: 'transparent',
          border: 'none',
          color: 'var(--theme-muted)',
          cursor: 'pointer',
          fontSize: 16,
        }}
      >
        ×
      </button>
    </div>
  );
};
