import type { FC } from 'react';
import { useSimStore } from '@/store/sim';
import { LOTO_STEPS, LOTO_STEP_LABEL, useLotoStore } from '@/store/loto';
import './LotoModal.css';

const REASON_LABEL: Record<string, string> = {
  wire: 'okablowania',
  device: 'aparatu',
  terminal: 'zacisku',
};

export const LotoModal: FC = () => {
  const prompt = useLotoStore((s) => s.prompt);
  const completedSteps = useLotoStore((s) => s.completedSteps);
  const closePrompt = useLotoStore((s) => s.closePrompt);
  const markStep = useLotoStore((s) => s.markStep);
  const resetProcedure = useLotoStore((s) => s.resetProcedure);
  const states = useSimStore((s) => s.view.devices);
  const setDeviceState = useSimStore((s) => s.setDeviceState);
  const setLock = useSimStore((s) => s.setLock);

  if (!prompt) return null;

  const q0 = states['-Q0'];
  const q0Off = !q0 || q0.on !== true;
  const q0Locked = q0?.locked === true;

  const onDisconnect = (): void => {
    setDeviceState('-Q0', { on: false });
    markStep('disconnect');
  };
  const onLock = (): void => {
    setLock('-Q0', true);
    markStep('lock');
  };
  const onVerify = (): void => {
    markStep('verify');
  };
  const onCancel = (): void => {
    closePrompt();
    resetProcedure();
  };

  return (
    <div className="loto-modal__overlay" role="dialog" aria-modal="true" aria-labelledby="loto-title">
      <div className="loto-modal">
        <div className="loto-modal__header">
          <span className="loto-modal__icon" aria-hidden="true">⚠</span>
          <h2 id="loto-title" className="loto-modal__title">Praca pod napięciem!</h2>
        </div>
        <p className="loto-modal__body">
          Próba dotknięcia {REASON_LABEL[prompt.reason] ?? prompt.reason}{' '}
          <span className="mono">{prompt.target}</span> przy obwodach pod napięciem. Zastosuj
          procedurę LOTO przed kontynuowaniem.
        </p>
        <ol className="loto-modal__steps">
          {LOTO_STEPS.map((step) => {
            const done = completedSteps.has(step);
            let action: null | { label: string; onClick: () => void; disabled?: boolean } = null;
            if (step === 'disconnect') {
              action = {
                label: q0Off ? 'Wyłączone' : 'Wyłącz -Q0',
                onClick: onDisconnect,
                disabled: q0Off,
              };
            } else if (step === 'lock') {
              action = {
                label: q0Locked ? 'Założona' : 'Załóż kłódkę',
                onClick: onLock,
                disabled: !q0Off || q0Locked,
              };
            } else {
              action = {
                label: done ? 'Potwierdzone' : 'Potwierdź pomiar',
                onClick: onVerify,
                disabled: !q0Locked || done,
              };
            }
            return (
              <li
                key={step}
                className={`loto-modal__step ${done ? 'is-done' : ''}`}
                data-step={step}
              >
                <span className="loto-modal__badge" aria-hidden="true">
                  {done ? '✓' : LOTO_STEPS.indexOf(step) + 1}
                </span>
                <span className="loto-modal__step-label">{LOTO_STEP_LABEL[step]}</span>
                <button
                  type="button"
                  className="loto-modal__btn"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="loto-modal__actions">
          <button
            type="button"
            className="loto-modal__cancel"
            onClick={onCancel}
          >
            Anuluj
          </button>
          <button
            type="button"
            className="loto-modal__confirm"
            onClick={closePrompt}
            disabled={completedSteps.size < LOTO_STEPS.length}
          >
            Kontynuuj pracę
          </button>
        </div>
      </div>
    </div>
  );
};
