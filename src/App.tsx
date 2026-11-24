import { useEffect, useMemo, type FC } from 'react';
import { Shell } from '@/ui/components/Shell';
import { TopBar } from '@/ui/components/TopBar';
import { Inspector } from '@/ui/components/Inspector';
import { EditorScreen } from '@/ui/screens/EditorScreen';
import { SchematicScreen } from '@/ui/screens/SchematicScreen';
import { MixedScreen } from '@/ui/screens/MixedScreen';
import { TaskEditorScreen } from '@/ui/screens/TaskEditorScreen';
import { TasksScreen } from '@/ui/screens/TasksScreen';
import { useTheme } from '@/ui/theme/useTheme';
import { useGlobalShortcuts } from '@/store/keyboard';
import { ShortToast } from '@/ui/components/ShortToast';
import { Meter } from '@/ui/components/Meter';
import { LotoModal } from '@/ui/components/LotoModal';
import { ResultModal } from '@/ui/components/ResultModal';
import { ShortcutsModal } from '@/ui/components/ShortcutsModal';
import { resolveState, useProjectStore } from '@/store/project';
import { useSimStore } from '@/store/sim';
import { useSimTicker } from '@/store/useSimTicker';
import { useUiStore } from '@/store/ui';

const SimProjectSync: FC = () => {
  const task = useProjectStore((s) => s.task);
  const library = useProjectStore((s) => s.library);
  const devices = useProjectStore((s) => s.devices);
  const wires = useProjectStore((s) => s.wires);
  const attachProject = useSimStore((s) => s.attachProject);

  const project = useMemo(() => {
    if (!task || !library) return null;
    return resolveState({ devices, wires, library });
  }, [task, library, devices, wires]);

  useEffect(() => {
    if (project) attachProject(project);
  }, [project, attachProject]);
  useSimTicker();
  return null;
};

export const App: FC = () => {
  const { theme, toggle } = useTheme();
  useGlobalShortcuts();
  const view = useUiStore((s) => s.view);

  const left =
    view === 'tasks' ? null : view === 'schematic' ? (
      <SchematicScreen slot="palette" />
    ) : view === 'mixed' ? (
      <MixedScreen slot="palette" />
    ) : view === 'editor' ? (
      <TaskEditorScreen slot="palette" />
    ) : (
      <EditorScreen slot="palette" />
    );
  const stage =
    view === 'tasks' ? (
      <TasksScreen slot="stage" />
    ) : view === 'schematic' ? (
      <SchematicScreen slot="stage" />
    ) : view === 'mixed' ? (
      <MixedScreen slot="stage" />
    ) : view === 'editor' ? (
      <TaskEditorScreen slot="stage" />
    ) : (
      <EditorScreen slot="stage" />
    );
  const right =
    view === 'tasks' ? null : view === 'schematic' ? (
      <SchematicScreen slot="right" />
    ) : view === 'mixed' ? (
      <MixedScreen slot="right" />
    ) : view === 'editor' ? (
      <TaskEditorScreen slot="right" />
    ) : (
      <Inspector />
    );

  return (
    <Shell
      topBar={
        <>
          <TopBar theme={theme} onToggleTheme={toggle} />
          <SimProjectSync />
        </>
      }
      left={left}
      stage={
        <>
          {stage}
          <Meter />
          <ShortToast />
          <LotoModal />
          <ResultModal />
          <ShortcutsModal />
        </>
      }
      right={right}
    />
  );
};
