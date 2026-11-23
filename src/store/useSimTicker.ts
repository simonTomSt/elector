import { useEffect } from 'react';
import { useSimStore } from './sim';

/**
 * Drives the sim tick via requestAnimationFrame whenever sim is on & running.
 * Attach once (e.g. in App) – the hook is a no-op while sim is off/paused.
 */
export const useSimTicker = (): void => {
  const on = useSimStore((s) => s.on);
  const running = useSimStore((s) => s.running);
  const tick = useSimStore((s) => s.tick);

  useEffect(() => {
    if (!on || !running) return;
    let raf = 0;
    const loop = (): void => {
      tick(performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on, running, tick]);
};
