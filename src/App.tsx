import { useEffect, useMemo, type FC } from 'react';
import { Shell } from '@/ui/components/Shell';
import { TopBar } from '@/ui/components/TopBar';
import { Inspector } from '@/ui/components/Inspector';
import { EditorScreen } from '@/ui/screens/EditorScreen';
import { SchematicScreen } from '@/ui/screens/SchematicScreen';
import { useTheme } from '@/ui/theme/useTheme';
import { ShortToast } from '@/ui/components/ShortToast';
import { Meter } from '@/ui/components/Meter';
import { LotoModal } from '@/ui/components/LotoModal';
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
  const view = useUiStore((s) => s.view);
  const isSchematic = view === 'schematic';

  return (
    <Shell
      topBar={
        <>
          <TopBar theme={theme} onToggleTheme={toggle} />
          <SimProjectSync />
        </>
      }
      left={isSchematic ? <SchematicScreen slot="palette" /> : <EditorScreen slot="palette" />}
      stage={
        <>
          {isSchematic ? <SchematicScreen slot="stage" /> : <EditorScreen slot="stage" />}
          <Meter />
          <ShortToast />
          <LotoModal />
        </>
      }
      right={isSchematic ? <SchematicScreen slot="right" /> : <Inspector />}
    />
  );
};
