import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  clearAll,
  exportSnapshot,
  importSnapshot,
  loadProject,
  loadProgress,
  loadUi,
  saveProject,
  saveProgress,
  saveUi,
} from '@/store/persist';
import type { DeviceInstance, Wire } from '@/domain/types';

const devices: DeviceInstance[] = [
  { tag: '-Q1', typeId: 'mcb-3p', placement: { rail: 1, xMm: 36 } },
];
const wires: Wire[] = [
  { id: 'U1', a: '-Q1:1', b: '-K1:1', color: 'brown', cs: 1.5 },
];

describe('M12 – persystencja', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('zapisuje i czyta projekt dla danego taskId', () => {
    saveProject('dol-4kw', { devices, wires });
    const read = loadProject('dol-4kw');
    expect(read).not.toBeNull();
    expect(read!.devices).toEqual(devices);
    expect(read!.wires).toEqual(wires);
  });

  it('trzyma projekty osobno per taskId', () => {
    saveProject('dol-4kw', { devices, wires });
    saveProject('diag-no-start', { devices: [], wires: [] });
    expect(loadProject('dol-4kw')?.devices).toHaveLength(1);
    expect(loadProject('diag-no-start')?.devices).toHaveLength(0);
  });

  it('zwraca null gdy brak zapisu', () => {
    expect(loadProject('whatever')).toBeNull();
  });

  it('odrzuca zapis z nieznaną wersją schema', () => {
    window.localStorage.setItem(
      'elector:project:dol-4kw',
      JSON.stringify({ schemaVersion: 999, devices: [], wires: [] }),
    );
    expect(loadProject('dol-4kw')).toBeNull();
  });

  it('odrzuca uszkodzony JSON bez wywalania', () => {
    window.localStorage.setItem('elector:project:dol-4kw', '{nie-json');
    expect(loadProject('dol-4kw')).toBeNull();
  });

  it('odrzuca zapis bez wymaganych pól', () => {
    window.localStorage.setItem(
      'elector:project:dol-4kw',
      JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, devices: 'nope' }),
    );
    expect(loadProject('dol-4kw')).toBeNull();
  });

  it('zapisuje i czyta ustawienia UI (motyw, widok, currentTaskId)', () => {
    saveUi({ theme: 'light', view: 'mixed', currentTaskId: 'dol-4kw' });
    expect(loadUi()).toEqual({ theme: 'light', view: 'mixed', currentTaskId: 'dol-4kw' });
  });

  it('zapisuje i czyta postęp zadań', () => {
    saveProgress({
      'dol-4kw': { status: 'w-toku', updatedAt: 1700000000000 },
      'diag-no-start': { status: 'ukonczone', updatedAt: 1700000001000 },
    });
    const p = loadProgress();
    expect(p['dol-4kw']?.status).toBe('w-toku');
    expect(p['diag-no-start']?.status).toBe('ukonczone');
  });

  it('round-trip eksport → import daje identyczny stan', () => {
    saveProject('dol-4kw', { devices, wires });
    saveProject('diag-no-start', { devices: [], wires: [] });
    saveUi({ theme: 'light', view: 'cabinet', currentTaskId: 'dol-4kw' });
    saveProgress({ 'dol-4kw': { status: 'w-toku', updatedAt: 1700000000000 } });

    const snap = exportSnapshot();
    clearAll();
    expect(loadProject('dol-4kw')).toBeNull();
    expect(loadUi()).toBeNull();

    const ok = importSnapshot(snap);
    expect(ok).toBe(true);
    expect(loadProject('dol-4kw')?.devices).toEqual(devices);
    expect(loadUi()?.theme).toBe('light');
    expect(loadProgress()['dol-4kw']?.status).toBe('w-toku');
  });

  it('importSnapshot odrzuca śmieci', () => {
    expect(importSnapshot('to nie jest json')).toBe(false);
    expect(importSnapshot(JSON.stringify({ schemaVersion: 999 }))).toBe(false);
  });

  it('eksport zawiera wersję i markerem produktu', () => {
    saveProject('dol-4kw', { devices, wires });
    const snap = JSON.parse(exportSnapshot()) as Record<string, unknown>;
    expect(snap['app']).toBe('elector');
    expect(snap['schemaVersion']).toBe(CURRENT_SCHEMA_VERSION);
  });
});
