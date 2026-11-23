import type { FC, ReactNode } from 'react';
import './Shell.css';

type Props = {
  topBar: ReactNode;
  left: ReactNode;
  stage: ReactNode;
  right: ReactNode;
};

export const Shell: FC<Props> = ({ topBar, left, stage, right }) => (
  <div className="shell">
    {topBar}
    <main className="shell__body">
      <aside className="shell__left" aria-label="Panel lewy">
        {left}
      </aside>
      <section className="shell__stage" aria-label="Scena">
        {stage}
      </section>
      <aside className="shell__right" aria-label="Panel prawy">
        {right}
      </aside>
    </main>
  </div>
);
