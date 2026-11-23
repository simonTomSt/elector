import type { FC } from 'react';
import type { ResolvedDevice, ResolvedProject } from '@/sim/model';
import { useSimStore } from '@/store/sim';
import './DoorView.css';

interface Props {
  project: ResolvedProject;
}

const colorOf = (rd: ResolvedDevice): string => {
  const c = rd.type.params['color'];
  if (c === 'red') return '#F0564F';
  if (c === 'green') return '#3FCF8E';
  if (c === 'yellow') return '#F5B53F';
  if (c === 'blue') return '#3CC7F0';
  return 'var(--scene-dev)';
};

const isPushButton = (rd: ResolvedDevice): boolean => rd.type.kind === 'pushbutton';
const isLamp = (rd: ResolvedDevice): boolean => rd.type.kind === 'lamp';
const isMainSwitch = (rd: ResolvedDevice): boolean => rd.type.kind === 'mainSwitch';

export const DoorView: FC<Props> = ({ project }) => {
  const simOn = useSimStore((s) => s.on);
  const states = useSimStore((s) => s.view.devices);
  const pressButton = useSimStore((s) => s.pressButton);
  const setDeviceState = useSimStore((s) => s.setDeviceState);
  const setLock = useSimStore((s) => s.setLock);

  const doorDevices = project.devices.filter(
    (d) => isPushButton(d) || isLamp(d) || isMainSwitch(d),
  );

  const onButtonDown = (tag: string): void => {
    if (!simOn) return;
    pressButton(tag, true);
  };
  const onButtonUp = (tag: string): void => {
    if (!simOn) return;
    pressButton(tag, false);
  };
  const onSwitchToggle = (tag: string): void => {
    if (!simOn) return;
    const st = states[tag] ?? {};
    setDeviceState(tag, { on: !st.on });
  };

  return (
    <div className="doorview" role="region" aria-label="Widok drzwi szafy">
      <div className="doorview__panel">
        <div className="doorview__title mono">Drzwi · aparatura sygnalizacyjna</div>
        <div className="doorview__grid">
          {doorDevices.map((rd) => {
            const tag = rd.instance.tag;
            const st = states[tag] ?? {};
            if (isLamp(rd)) {
              const lit = st.lit === true;
              return (
                <div key={tag} className="doorview__cell">
                  <div
                    className={`doorview__lamp ${lit ? 'is-lit' : ''}`}
                    style={{ ['--lamp-color' as string]: colorOf(rd) }}
                    aria-label={`Lampka ${tag} ${lit ? 'świeci' : 'zgaszona'}`}
                  />
                  <div className="doorview__label mono">{tag}</div>
                </div>
              );
            }
            if (isPushButton(rd)) {
              const pressed = st.pressed === true;
              const legend = String(rd.type.params['legend'] ?? '');
              return (
                <div key={tag} className="doorview__cell">
                  <button
                    type="button"
                    className={`doorview__button ${pressed ? 'is-pressed' : ''}`}
                    style={{ ['--btn-color' as string]: colorOf(rd) }}
                    onPointerDown={() => onButtonDown(tag)}
                    onPointerUp={() => onButtonUp(tag)}
                    onPointerLeave={() => onButtonUp(tag)}
                    onPointerCancel={() => onButtonUp(tag)}
                    disabled={!simOn}
                    aria-pressed={pressed}
                  >
                    {legend}
                  </button>
                  <div className="doorview__label mono">{tag}</div>
                </div>
              );
            }
            if (isMainSwitch(rd)) {
              const on = st.on === true;
              const locked = st.locked === true;
              const lockable = String(rd.type.params['lockable']) === 'true';
              return (
                <div key={tag} className="doorview__cell">
                  <button
                    type="button"
                    className={`doorview__switch ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
                    onClick={() => onSwitchToggle(tag)}
                    disabled={!simOn || locked}
                    aria-pressed={on}
                    aria-label={`Wyłącznik ${tag} ${on ? 'załączony' : 'wyłączony'}${locked ? ', zablokowany kłódką' : ''}`}
                  >
                    <span className="doorview__switch-handle" />
                    <span className="doorview__switch-label mono">{on ? 'I' : '0'}</span>
                  </button>
                  <div className="doorview__label mono">{tag}</div>
                  {lockable && (
                    <button
                      type="button"
                      className={`doorview__lock ${locked ? 'is-locked' : ''}`}
                      onClick={() => simOn && setLock(tag, !locked)}
                      disabled={!simOn}
                      aria-pressed={locked}
                      aria-label={locked ? `Zdejmij kłódkę z ${tag}` : `Załóż kłódkę na ${tag}`}
                      title={locked ? 'Zdejmij kłódkę (LOTO)' : 'Załóż kłódkę (LOTO)'}
                    >
                      {locked ? '🔒' : '🔓'}
                    </button>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
        {!simOn && (
          <p className="doorview__hint">Włącz symulację, aby operować aparatami.</p>
        )}
      </div>
    </div>
  );
};
