export type Potential = 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'DC+' | 'DC0';

export type TerminalRef = string;

export type DeviceKind =
  | 'mainSwitch'
  | 'mcb'
  | 'motorBreaker'
  | 'contactor'
  | 'overload'
  | 'psu'
  | 'terminal'
  | 'peBar'
  | 'pushbutton'
  | 'lamp'
  | 'motor'
  | 'timer'
  | 'supply';

export type ContactActuator = 'coil' | 'handle' | 'button' | 'thermal' | 'trip';

export interface Contact {
  from: string;
  to: string;
  type: 'NO' | 'NC';
  actuator: ContactActuator;
}

export type LoadKind = 'coilDC' | 'coilAC' | 'lamp' | 'psuIn' | 'motorWinding';

export interface Load {
  a: string;
  b: string;
  kind: LoadKind;
}

export type TerminalSide = 'top' | 'bottom' | 'front';

export interface Terminal {
  id: string;
  side?: TerminalSide;
  x?: number;
}

export type DeviceParam = number | string;

export interface DeviceType {
  id: string;
  kind: DeviceKind;
  prefix: string;
  widthMm: number;
  mount: 'rail' | 'door' | 'external';
  label?: string;
  terminals: Terminal[];
  contacts?: Contact[];
  links?: [string, string][];
  loads?: Load[];
  params: Record<string, DeviceParam>;
  variants?: Record<string, Record<string, string>>;
}

export type DevicePlacement =
  | { rail: number; xMm: number }
  | { door: true; x: number; y: number };

export interface DeviceInstance {
  tag: string;
  typeId: string;
  group?: string;
  placement?: DevicePlacement;
  params?: Record<string, DeviceParam>;
}

export type WireColor =
  | 'brown'
  | 'black'
  | 'grey'
  | 'blue'
  | 'greenYellow'
  | 'darkBlue'
  | 'red'
  | 'white';

export type WireCrossSection = 0.75 | 1 | 1.5 | 2.5 | 4;

export type WireFault = 'open' | 'loose';

export interface Wire {
  id: string;
  a: TerminalRef;
  b: TerminalRef;
  color: WireColor;
  cs: WireCrossSection;
  ferrule?: boolean;
  fixed?: boolean;
  route?: [number, number][];
  fault?: WireFault;
}

export interface Project {
  devices: DeviceInstance[];
  wires: Wire[];
  schematic?: Schematic;
}

export type SymbolElement =
  | 'breaker3'
  | 'breaker1'
  | 'mainContacts3'
  | 'contactNO'
  | 'contactNC'
  | 'coil'
  | 'coilTimer'
  | 'thermal3'
  | 'thermalNC'
  | 'thermalNO'
  | 'pbNO'
  | 'pbNC'
  | 'fuse'
  | 'lamp'
  | 'motor3'
  | 'psu'
  | 'terminal'
  | 'potential'
  | 'reference';

export interface SchematicSymbol {
  id: string;
  tag: string;
  element: SymbolElement;
  pins: TerminalRef[];
  sheet?: number;
  col?: number;
  row?: string;
  /** Pozycja symbolu na arkuszu w jednostkach użytkownika (siatka 10). */
  x?: number;
  y?: number;
}

export interface SchematicSheet {
  n: number;
  title?: string;
}

export interface PotentialTag {
  id: string;
  name: string;
  sheet?: number;
  x?: number;
  y?: number;
  /** Pin, którego dotyczy etykieta potencjału. */
  pin?: TerminalRef;
}

export interface Schematic {
  sheets?: SchematicSheet[];
  symbols: SchematicSymbol[];
  connections: [string, string][];
  potentials?: PotentialTag[];
}

export type TaskType = 'cabinet' | 'schematic' | 'mixed' | 'diagnostic';
export type TaskLevel = 'podstawowy' | 'średni' | 'zaawansowany';
export type SceneStart = 'empty' | 'railsDucts' | 'mounted' | 'wired';

export type RequirementCheck =
  | 'deviceExists'
  | 'connected'
  | 'inSeries'
  | 'parallel'
  | 'wireColors'
  | 'setting'
  | 'scenario'
  | 'schematicMatchesCabinet'
  | 'schematicConnected'
  | 'noErc';

export interface Requirement {
  id: string;
  text: string;
  group?: string;
  check: RequirementCheck;
  args?: Record<string, unknown>;
}

export type ScenarioAction = 'set' | 'press' | 'release' | 'wait' | 'measure' | 'lock' | 'unlock';
export type MeterRange = 'vac' | 'vdc' | 'ohm' | 'cont' | 'aac';

export interface ScenarioStep {
  do?: ScenarioAction;
  tag?: string;
  state?: Record<string, unknown>;
  ms?: number;
  probes?: TerminalRef[];
  range?: MeterRange;
  expect?: Record<string, unknown>;
}

export interface TestScenario {
  id: string;
  name: string;
  steps: ScenarioStep[];
}

export type WireFaultKind = 'open' | 'loose';
export type DeviceFaultKind = 'coilOpen' | 'tripped' | 'contactWelded' | 'contactOpen';

export interface Fault {
  id: string;
  label: string;
  apply: {
    wire?: string;
    wireFault?: WireFaultKind;
    device?: string;
    deviceFault?: DeviceFaultKind;
    random?: boolean;
  };
}

export interface Rail {
  yMm: number;
  lengthMm: number;
}

export interface Duct {
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
}

export interface TaskParamDef {
  choices: unknown[];
  derive?: Record<string, unknown>;
}

export interface Scene {
  start: SceneStart;
  supply?: TerminalRef;
  rails?: Rail[];
  ducts?: Duct[];
  preset?: Project;
  palette?: string[];
}

export type HintLevel = 'subtelna' | 'bezpośrednia' | 'rozwiązanie';

export interface Hint {
  id: string;
  text: string;
  level?: HintLevel;
}

export interface Scoring {
  lotoPenalty?: number;
  hintPenalty?: number;
  hintLevels?: Partial<Record<HintLevel, number>>;
}

export interface Task {
  id: string;
  extends?: string;
  type: TaskType;
  title: string;
  level?: TaskLevel;
  durationMin?: number;
  statement: string;
  params?: Record<string, TaskParamDef>;
  scene: Scene;
  givenSchematic?: Schematic | { $ref: string; comment?: string };
  requirements: Requirement[];
  testScenarios?: TestScenario[];
  faults?: Fault[];
  pickFaults?: number;
  symptom?: string;
  hints?: Hint[];
  scoring?: Scoring;
  solution?: Project;
  solutionSchematic?: Schematic;
}
