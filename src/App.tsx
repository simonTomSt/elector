import type { FC } from 'react';
import { Shell } from '@/ui/components/Shell';
import { TopBar } from '@/ui/components/TopBar';
import { Inspector } from '@/ui/components/Inspector';
import { EditorScreen } from '@/ui/screens/EditorScreen';
import { useTheme } from '@/ui/theme/useTheme';

export const App: FC = () => {
  const { theme, toggle } = useTheme();

  return (
    <Shell
      topBar={<TopBar theme={theme} onToggleTheme={toggle} />}
      left={<EditorScreen slot="palette" />}
      stage={<EditorScreen slot="stage" />}
      right={<Inspector />}
    />
  );
};
