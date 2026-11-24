export interface DeviceRuntimeState {
  on?: boolean;
  locked?: boolean;
  tripped?: boolean;
  coil?: boolean;
  closed?: boolean;
  manual?: boolean;
  pressed?: boolean;
  heat?: number;
  resetMode?: 'H' | 'A';
  out?: boolean;
  elapsed?: number;
  lit?: boolean;
  rpm?: number;
  current?: number;
  load?: number;
  running?: boolean;
  pendingCloseMs?: number;
  pendingOpenMs?: number;
  psuPoweredMs?: number;
  runMs?: number;
  overloadMs?: number;
  coilOpen?: boolean;
  /** Fault: wszystkie styki tego aparatu stale zamknięte (zgrzały się). */
  contactsWelded?: boolean;
  /** Fault: wszystkie styki tego aparatu stale otwarte (przerwane mechanicznie). */
  contactsOpen?: boolean;
}

export type DeviceStates = Record<string, DeviceRuntimeState>;

export const defaultStateFor = (kind: string): DeviceRuntimeState => {
  switch (kind) {
    case 'mainSwitch':
    case 'mcb':
    case 'motorBreaker':
      return { on: false, tripped: false };
    case 'contactor':
      return { coil: false, closed: false, manual: false };
    case 'overload':
      return { heat: 0, tripped: false, resetMode: 'H' };
    case 'pushbutton':
      return { pressed: false };
    case 'psu':
      return { out: false };
    case 'lamp':
      return { lit: false };
    case 'motor':
      return { rpm: 0, current: 0 };
    case 'timer':
      return { coil: false, elapsed: 0, out: false };
    default:
      return {};
  }
};
