import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTaskRepo, loadTask, TaskValidationError } from '@/tasks/loader';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(here, '..', 'tasks', 'examples');

const readRaw = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(examplesDir, name), 'utf8')) as unknown;

describe('Ładowanie zadań', () => {
  const devices = loadDeviceLibrary();

  it('wszystkie przykłady ładują się bez błędów', () => {
    const files = readdirSync(examplesDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThanOrEqual(4);
    const raws = files.map(readRaw);
    const { byId, tasks } = loadTaskRepo(raws, devices);
    expect(tasks.length).toBe(files.length);
    expect(byId.has('dol-4kw')).toBe(true);
    expect(byId.has('dol-schematic')).toBe(true);
    expect(byId.has('dol-mixed')).toBe(true);
    expect(byId.has('diag-no-start')).toBe(true);
  });

  it('extends dziedziczy scenę i solution po zadaniu bazowym', () => {
    const base = readRaw('dol-4kw.json');
    const diag = readRaw('diag-no-start.json');
    const { byId } = loadTaskRepo([base, diag], devices);
    const resolved = byId.get('diag-no-start');
    expect(resolved?.scene.preset?.devices.length).toBeGreaterThan(0);
    expect(resolved?.solution?.devices.some((d) => d.tag === '-K1')).toBe(true);
  });

  it('givenSchematic $ref łączy givenSchematic + solutionSchematic', () => {
    const base = readRaw('dol-4kw.json');
    const sch = readRaw('dol-schematic.json');
    const mixed = readRaw('dol-mixed.json');
    const { byId } = loadTaskRepo([base, sch, mixed], devices);
    const resolved = byId.get('dol-mixed');
    const given = resolved?.givenSchematic;
    expect(given && 'symbols' in given).toBe(true);
    const sym = (given as { symbols: { tag: string }[] }).symbols;
    expect(sym.some((s) => s.tag === '-Q1')).toBe(true);
    expect(sym.some((s) => s.tag === '-S1')).toBe(true);
  });

  it('błędny JSON (brak id) daje czytelny komunikat ze ścieżką', () => {
    const bad = { type: 'cabinet', title: 't', statement: 's', scene: { start: 'empty' }, requirements: [] };
    expect(() => loadTask(bad, { devices })).toThrow(TaskValidationError);
    try {
      loadTask(bad, { devices });
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/schema/);
      expect(msg).toMatch(/id/);
    }
  });

  it('błędny JSON (zły enum type) daje komunikat z dozwolonymi wartościami', () => {
    const bad = {
      id: 'x',
      type: 'nieprawidlowy',
      title: 't',
      statement: 's',
      scene: { start: 'empty' },
      requirements: [],
    };
    try {
      loadTask(bad, { devices });
      throw new Error('powinno rzucić');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/cabinet/);
      expect(msg).toMatch(/schematic/);
    }
  });

  it('zgłasza nieznany typeId', () => {
    const bad = {
      id: 'y',
      type: 'cabinet',
      title: 't',
      statement: 's',
      scene: { start: 'empty', palette: ['nieistnieje-xyz'] },
      requirements: [],
    };
    expect(() => loadTask(bad, { devices })).toThrow(/nieznany typeId "nieistnieje-xyz"/);
  });
});
