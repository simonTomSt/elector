import type { SymbolElement } from '@/domain/types';

export interface SymbolPinSpec {
  /** Suffix zacisku (bez tagu). */
  id: string;
  /** Pozycja piny w lokalnym układzie symbolu (0..40). */
  x: number;
  y: number;
}

export interface SymbolSpec {
  element: SymbolElement;
  name: string;
  group: 'sw' | 'coil' | 'prot' | 'load' | 'conn';
  /** Ścieżka SVG, układ 0..40 × 0..40. */
  path: string;
  /** Domyślne piny z kodami, w kolejności odpowiadającej numeracji IEC. */
  pins: SymbolPinSpec[];
  /** Szerokość i wysokość logiczna (dla siatki). */
  width: number;
  height: number;
  /** Styl kreski: główny (power) czy sterowania (control). */
  strokeKind?: 'power' | 'control';
}

export const SYMBOLS: Record<SymbolElement, SymbolSpec> = {
  contactNO: {
    element: 'contactNO',
    name: 'Styk NO',
    group: 'sw',
    path: 'M20 4V14 M20 36V26 L12 15',
    pins: [{ id: '13', x: 20, y: 4 }, { id: '14', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  contactNC: {
    element: 'contactNC',
    name: 'Styk NC',
    group: 'sw',
    path: 'M20 4V14 H28 M20 36V26 L29 13',
    pins: [{ id: '21', x: 20, y: 4 }, { id: '22', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  pbNO: {
    element: 'pbNO',
    name: 'Przycisk NO',
    group: 'sw',
    path: 'M22 4V14 M22 36V26 L14 15 M18 21H8 M8 17V25 M8 17H5 M8 25H5',
    pins: [{ id: '13', x: 22, y: 4 }, { id: '14', x: 22, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  pbNC: {
    element: 'pbNC',
    name: 'Przycisk NC',
    group: 'sw',
    path: 'M22 4V14 H30 M22 36V26 L31 13 M26 20H10 M10 16V24 M10 16H7 M10 24H7',
    pins: [{ id: '11', x: 22, y: 4 }, { id: '12', x: 22, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  coil: {
    element: 'coil',
    name: 'Cewka',
    group: 'coil',
    path: 'M20 4V12 M20 28V36 M12 12H28V28H12Z',
    pins: [{ id: 'A1', x: 20, y: 4 }, { id: 'A2', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  coilTimer: {
    element: 'coilTimer',
    name: 'Cewka czasowa',
    group: 'coil',
    path: 'M20 4V12 M20 28V36 M12 12H28V28H12Z M12 12L28 28',
    pins: [{ id: 'A1', x: 20, y: 4 }, { id: 'A2', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  thermalNC: {
    element: 'thermalNC',
    name: 'Termik NC',
    group: 'coil',
    path: 'M20 4V10 M20 30V36 M13 10H27V30H13Z M20 10V15H16V25H20V30',
    pins: [{ id: '95', x: 20, y: 4 }, { id: '96', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  thermalNO: {
    element: 'thermalNO',
    name: 'Termik NO',
    group: 'coil',
    path: 'M20 4V10 M20 30V36 M13 10H27V30H13Z M20 10L28 30',
    pins: [{ id: '97', x: 20, y: 4 }, { id: '98', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  thermal3: {
    element: 'thermal3',
    name: 'Element grzejny',
    group: 'coil',
    path: 'M10 4V36 M20 4V36 M30 4V36 M13 10H27V30H13Z',
    pins: [
      { id: '1', x: 10, y: 4 }, { id: '2', x: 10, y: 36 },
      { id: '3', x: 20, y: 4 }, { id: '4', x: 20, y: 36 },
      { id: '5', x: 30, y: 4 }, { id: '6', x: 30, y: 36 },
    ],
    width: 40,
    height: 40,
    strokeKind: 'power',
  },
  breaker3: {
    element: 'breaker3',
    name: 'Wyłącznik 3P',
    group: 'prot',
    path: 'M10 4V10 M10 34V36 M10 34L5 14 M20 4V10 M20 34V36 M20 34L15 14 M30 4V10 M30 34V36 M30 34L25 14 M8 8L12 12 M12 8L8 12 M18 8L22 12 M22 8L18 12 M28 8L32 12 M32 8L28 12',
    pins: [
      { id: '1', x: 10, y: 4 }, { id: '2', x: 10, y: 36 },
      { id: '3', x: 20, y: 4 }, { id: '4', x: 20, y: 36 },
      { id: '5', x: 30, y: 4 }, { id: '6', x: 30, y: 36 },
    ],
    width: 40,
    height: 40,
    strokeKind: 'power',
  },
  breaker1: {
    element: 'breaker1',
    name: 'Wyłącznik 1P',
    group: 'prot',
    path: 'M20 4V10 M20 34V36 M20 34L13 14 M18 8L22 12 M22 8L18 12',
    pins: [{ id: '1', x: 20, y: 4 }, { id: '2', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  mainContacts3: {
    element: 'mainContacts3',
    name: 'Styki główne 3P',
    group: 'sw',
    path: 'M10 4V10 M10 34V36 M10 34L5 14 M20 4V10 M20 34V36 M20 34L15 14 M30 4V10 M30 34V36 M30 34L25 14 M6 10a4 4 0 0 0 8 0 M16 10a4 4 0 0 0 8 0 M26 10a4 4 0 0 0 8 0',
    pins: [
      { id: '1', x: 10, y: 4 }, { id: '2', x: 10, y: 36 },
      { id: '3', x: 20, y: 4 }, { id: '4', x: 20, y: 36 },
      { id: '5', x: 30, y: 4 }, { id: '6', x: 30, y: 36 },
    ],
    width: 40,
    height: 40,
    strokeKind: 'power',
  },
  fuse: {
    element: 'fuse',
    name: 'Bezpiecznik',
    group: 'prot',
    path: 'M20 4V36 M15 10H25V30H15Z',
    pins: [{ id: '1', x: 20, y: 4 }, { id: '2', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  motor3: {
    element: 'motor3',
    name: 'Silnik 3~',
    group: 'load',
    path: 'M20 4V6 M4 20a16 16 0 1 0 32 0a16 16 0 1 0 -32 0',
    pins: [
      { id: 'U1', x: 12, y: 4 },
      { id: 'V1', x: 20, y: 4 },
      { id: 'W1', x: 28, y: 4 },
    ],
    width: 40,
    height: 40,
    strokeKind: 'power',
  },
  lamp: {
    element: 'lamp',
    name: 'Lampka',
    group: 'load',
    path: 'M20 4V10 M20 30V36 M20 10a10 10 0 1 0 0.01 0 M13 13L27 27 M27 13L13 27',
    pins: [{ id: 'X1', x: 20, y: 4 }, { id: 'X2', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  psu: {
    element: 'psu',
    name: 'Zasilacz',
    group: 'load',
    path: 'M8 8H32V32H8Z M8 32L32 8 M11 15q2.5-3 5 0t5 0 M21 27H29',
    pins: [
      { id: 'L', x: 12, y: 8 },
      { id: 'N', x: 20, y: 8 },
      { id: '+', x: 20, y: 32 },
      { id: '-', x: 28, y: 32 },
    ],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  terminal: {
    element: 'terminal',
    name: 'Złączka',
    group: 'conn',
    path: 'M20 4V16 M20 24V36 M16 20a4 4 0 1 0 8 0a4 4 0 1 0 -8 0',
    pins: [{ id: 'top', x: 20, y: 4 }, { id: 'bot', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  potential: {
    element: 'potential',
    name: 'Potencjał',
    group: 'conn',
    path: 'M8 8H32 M20 8V36 M16 30L20 36L24 30',
    pins: [{ id: 'p', x: 20, y: 36 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
  reference: {
    element: 'reference',
    name: 'Odsyłacz',
    group: 'conn',
    path: 'M6 20H24 M24 14L32 20L24 26Z',
    pins: [{ id: 'r', x: 6, y: 20 }],
    width: 40,
    height: 40,
    strokeKind: 'control',
  },
};

export const SYMBOL_GROUPS: readonly { id: SymbolSpec['group']; name: string }[] = [
  { id: 'sw', name: 'Łączniki' },
  { id: 'coil', name: 'Cewki i przekaźniki' },
  { id: 'prot', name: 'Zabezpieczenia' },
  { id: 'load', name: 'Odbiorniki i zasilanie' },
  { id: 'conn', name: 'Połączenia' },
];

export const symbolsInGroup = (group: SymbolSpec['group']): SymbolSpec[] =>
  Object.values(SYMBOLS).filter((s) => s.group === group);
