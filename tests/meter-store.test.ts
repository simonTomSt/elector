import { describe, it, expect, beforeEach } from 'vitest';
import { useMeterStore, METER_RANGES } from '@/store/meter';

describe('M8 – store miernika', () => {
  beforeEach(() => {
    useMeterStore.setState({
      open: false,
      x: 24,
      y: 24,
      range: 'off',
      probes: [null, null],
      pickActive: null,
      hold: false,
      minmax: false,
      rel: false,
      relRef: null,
      history: [],
    });
  });

  it('togglePanel otwiera i zamyka', () => {
    useMeterStore.getState().togglePanel();
    expect(useMeterStore.getState().open).toBe(true);
    useMeterStore.getState().closePanel();
    expect(useMeterStore.getState().open).toBe(false);
  });

  it('cycleRange przechodzi przez wszystkie 6 pozycji', () => {
    for (let i = 0; i < METER_RANGES.length; i++) {
      useMeterStore.getState().cycleRange(1);
    }
    expect(useMeterStore.getState().range).toBe('off');
  });

  it('startPick + pickTerminal przypisuje sondę', () => {
    useMeterStore.getState().startPick(0);
    expect(useMeterStore.getState().pickActive).toBe(0);
    const ok = useMeterStore.getState().pickTerminal('-K1:A1');
    expect(ok).toBe(true);
    expect(useMeterStore.getState().probes[0]).toBe('-K1:A1');
    expect(useMeterStore.getState().pickActive).toBe(null);
  });

  it('swapProbes zamienia sondy', () => {
    useMeterStore.getState().attachProbe(0, '-A');
    useMeterStore.getState().attachProbe(1, '-B');
    useMeterStore.getState().swapProbes();
    expect(useMeterStore.getState().probes).toEqual(['-B', '-A']);
  });

  it('toggleRel zapamiętuje punkt odniesienia', () => {
    useMeterStore.getState().toggleRel(230.2);
    expect(useMeterStore.getState().rel).toBe(true);
    expect(useMeterStore.getState().relRef).toBeCloseTo(230.2, 1);
    useMeterStore.getState().toggleRel(null);
    expect(useMeterStore.getState().rel).toBe(false);
  });
});
