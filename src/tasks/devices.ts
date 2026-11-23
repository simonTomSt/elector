import devicesJson from '../../data/devices.json';
import type { DeviceType } from '@/domain/types';

export class DeviceLibraryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceLibraryError';
  }
}

export type DeviceLibrary = {
  byId: ReadonlyMap<string, DeviceType>;
  all: readonly DeviceType[];
};

const assertObject = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DeviceLibraryError(`${path}: oczekiwano obiektu`);
  }
  return value as Record<string, unknown>;
};

export const parseDeviceLibrary = (raw: unknown): DeviceLibrary => {
  const root = assertObject(raw, 'devices');
  const types = root['types'];
  if (!Array.isArray(types)) {
    throw new DeviceLibraryError('devices.types: oczekiwano tablicy typów');
  }

  const byId = new Map<string, DeviceType>();
  types.forEach((item, idx) => {
    const t = assertObject(item, `devices.types[${idx}]`);
    const id = t['id'];
    if (typeof id !== 'string' || id.length === 0) {
      throw new DeviceLibraryError(`devices.types[${idx}].id: wymagane niepuste string`);
    }
    if (byId.has(id)) {
      throw new DeviceLibraryError(`devices.types: duplikat id "${id}"`);
    }
    const terminals = t['terminals'];
    if (!Array.isArray(terminals) || terminals.length === 0) {
      throw new DeviceLibraryError(`devices.types[${id}].terminals: wymagana niepusta tablica`);
    }
    const seen = new Set<string>();
    terminals.forEach((term, tIdx) => {
      const te = assertObject(term, `devices.types[${id}].terminals[${tIdx}]`);
      if (typeof te['id'] !== 'string') {
        throw new DeviceLibraryError(
          `devices.types[${id}].terminals[${tIdx}].id: wymagany string`,
        );
      }
      if (seen.has(te['id'])) {
        throw new DeviceLibraryError(
          `devices.types[${id}].terminals: duplikat zacisku "${te['id']}"`,
        );
      }
      seen.add(te['id']);
    });

    byId.set(id, item as DeviceType);
  });

  return { byId, all: types as DeviceType[] };
};

let cached: DeviceLibrary | null = null;

export const loadDeviceLibrary = (): DeviceLibrary => {
  if (!cached) cached = parseDeviceLibrary(devicesJson);
  return cached;
};
