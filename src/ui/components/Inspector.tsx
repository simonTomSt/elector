import { useMemo, type FC } from 'react';
import type { FC as ReactFC } from 'react';
import { resolveState, useProjectStore } from '@/store/project';
import { validateLive, type ValidationIssue } from '@/validation/live';
import type { ResolvedProject } from '@/sim/model';
import type { Requirement, Wire } from '@/domain/types';
import { HintsPanel } from './HintsPanel';
import './Inspector.css';

const formatWireColor = (c: Wire['color']): string => {
  switch (c) {
    case 'brown':
      return 'brązowy (L1)';
    case 'black':
      return 'czarny (L2)';
    case 'grey':
      return 'szary (L3)';
    case 'blue':
      return 'niebieski (N)';
    case 'greenYellow':
      return 'zielono-żółty (PE)';
    case 'darkBlue':
      return 'ciemnoniebieski (DC)';
    case 'red':
      return 'czerwony';
    case 'white':
      return 'biały';
  }
};

const formatCs = (cs: Wire['cs']): string => `${String(cs).replace('.', ',')} mm²`;

interface DeviceSectionProps {
  tag: string;
  project: ResolvedProject;
}

const DeviceSection: ReactFC<DeviceSectionProps> = ({ tag, project }) => {
  const dev = project.byTag.get(tag);
  if (!dev) return null;
  const connections = project.wires.filter((w) => {
    const ta = w.a.startsWith(`${tag}:`) || w.a.startsWith(`${tag}.`);
    const tb = w.b.startsWith(`${tag}:`) || w.b.startsWith(`${tag}.`);
    return ta || tb;
  });
  const paramEntries = Object.entries({ ...dev.type.params, ...(dev.instance.params ?? {}) });
  return (
    <>
      <div className="inspector__block">
        <span className="inspector__tag">{dev.instance.tag}</span>
        <span className="inspector__sub">{dev.type.label ?? dev.type.id}</span>
      </div>
      {paramEntries.length > 0 && (
        <div className="inspector__block">
          <span className="inspector__sub">Parametry</span>
          <ul className="inspector__list">
            {paramEntries.map(([k, v]) => (
              <li key={k}>
                <span className="k">{k}</span>
                <span>{String(v).replace('.', ',')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="inspector__block">
        <span className="inspector__sub">
          Zaciski · {dev.terminalRefs.length} · podłączeń: {connections.length}
        </span>
        <ul className="inspector__list">
          {dev.terminalRefs.map((ref) => {
            const sep = dev.type.kind === 'terminal' ? '.' : ':';
            const tid = ref.slice(dev.instance.tag.length + 1);
            const wire = connections.find((w) => w.a === ref || w.b === ref);
            const other = wire ? (wire.a === ref ? wire.b : wire.a) : null;
            return (
              <li key={ref}>
                <span className="k">
                  {dev.instance.tag}
                  {sep}
                  {tid}
                </span>
                <span>{other ?? '—'}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
};

interface WireSectionProps {
  wireId: string;
  project: ResolvedProject;
}

const WireSection: ReactFC<WireSectionProps> = ({ wireId, project }) => {
  const wire = project.wires.find((w) => w.id === wireId);
  if (!wire) return null;
  return (
    <div className="inspector__block">
      <span className="inspector__tag">{wire.id}</span>
      <span className="inspector__sub">
        {wire.a} ↔ {wire.b}
      </span>
      <ul className="inspector__list">
        <li>
          <span className="k">kolor</span>
          <span>{formatWireColor(wire.color)}</span>
        </li>
        <li>
          <span className="k">przekrój</span>
          <span>{formatCs(wire.cs)}</span>
        </li>
        <li>
          <span className="k">tulejka</span>
          <span>{wire.ferrule ? 'tak' : 'nie'}</span>
        </li>
        {wire.fixed && (
          <li>
            <span className="k">status</span>
            <span>stały</span>
          </li>
        )}
      </ul>
    </div>
  );
};

interface RequirementItemProps {
  req: Requirement;
  issue: ValidationIssue | undefined;
}

const RequirementItem: ReactFC<RequirementItemProps> = ({ req, issue }) => {
  const ok = !issue;
  const sev = issue?.severity ?? null;
  const cls = ok
    ? 'inspector__req inspector__req--ok'
    : sev === 'warning'
      ? 'inspector__req'
      : 'inspector__req inspector__req--err';
  const badgeCls = ok
    ? 'inspector__badge inspector__badge--ok'
    : sev === 'warning'
      ? 'inspector__badge inspector__badge--warn'
      : 'inspector__badge inspector__badge--err';
  return (
    <li className={cls}>
      <span className={badgeCls} aria-hidden="true">
        {ok ? '✓' : '!'}
      </span>
      <span>
        {req.text}
        {issue?.detail && <span className="inspector__detail">{issue.detail}</span>}
      </span>
    </li>
  );
};

export const Inspector: FC = () => {
  const task = useProjectStore((s) => s.task);
  const library = useProjectStore((s) => s.library);
  const devices = useProjectStore((s) => s.devices);
  const wires = useProjectStore((s) => s.wires);
  const selectedTag = useProjectStore((s) => s.selectedTag);
  const selectedWireId = useProjectStore((s) => s.selectedWireId);

  const project = useMemo(() => {
    if (!task || !library) return null;
    return resolveState({ devices, wires, library });
  }, [task, library, devices, wires]);

  const validation = useMemo(() => {
    if (!task || !project) return null;
    return validateLive(task.requirements, project);
  }, [task, project]);

  if (!task || !project) {
    return (
      <div className="inspector">
        <p style={{ color: 'var(--theme-muted)' }}>Ładowanie…</p>
      </div>
    );
  }

  if (selectedTag) {
    return (
      <div className="inspector">
        <h2 className="inspector__title">Inspektor</h2>
        <DeviceSection tag={selectedTag} project={project} />
      </div>
    );
  }

  if (selectedWireId) {
    return (
      <div className="inspector">
        <h2 className="inspector__title">Przewód</h2>
        <WireSection wireId={selectedWireId} project={project} />
      </div>
    );
  }

  const issueMap = new Map<string, ValidationIssue>();
  for (const i of validation?.issues ?? []) issueMap.set(i.requirementId, i);
  const failedCount = validation?.issues.filter((i) => i.severity === 'error').length ?? 0;

  return (
    <div className="inspector">
      <h2 className="inspector__title">Treść zadania</h2>
      <div className="inspector__block">
        <span className="inspector__sub">{task.title}</span>
        <p style={{ margin: 0, fontSize: 13 }}>{task.statement}</p>
      </div>
      <h2 className="inspector__title">
        Wymagania · {failedCount === 0 ? 'OK' : `${failedCount} do zrobienia`}
      </h2>
      <ul className="inspector__list" style={{ gap: 8 }}>
        {task.requirements.map((req) => (
          <RequirementItem key={req.id} req={req} issue={issueMap.get(req.id)} />
        ))}
      </ul>
      <HintsPanel />
    </div>
  );
};
