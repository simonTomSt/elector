import type { FC, ReactNode } from 'react';
import { useUiStore } from '@/store/ui';
import './Shell.css';

type Props = {
  topBar: ReactNode;
  left: ReactNode;
  stage: ReactNode;
  right: ReactNode;
};

export const Shell: FC<Props> = ({ topBar, left, stage, right }) => {
  const leftOpen = useUiStore((s) => s.leftOpen);
  const rightOpen = useUiStore((s) => s.rightOpen);
  // Jeśli dany slot nie ma treści (np. widok 'tasks'), traktujemy go jako „zawsze schowany",
  // ale aside i tak jest w DOM-ie (z aria-hidden) żeby layout był przewidywalny dla testów.
  const hasLeft = left !== null && left !== undefined;
  const hasRight = right !== null && right !== undefined;
  const leftVisible = hasLeft && leftOpen;
  const rightVisible = hasRight && rightOpen;
  return (
    <div
      className="shell"
      data-left-open={leftVisible ? '1' : '0'}
      data-right-open={rightVisible ? '1' : '0'}
    >
      {topBar}
      <main className="shell__body">
        <aside
          className="shell__left"
          aria-label="Panel lewy"
          aria-hidden={!leftVisible}
          data-empty={hasLeft ? '0' : '1'}
        >
          {left}
        </aside>
        <section className="shell__stage" aria-label="Scena">
          {stage}
        </section>
        <aside
          className="shell__right"
          aria-label="Panel prawy"
          aria-hidden={!rightVisible}
          data-empty={hasRight ? '0' : '1'}
        >
          {right}
        </aside>
      </main>
    </div>
  );
};
