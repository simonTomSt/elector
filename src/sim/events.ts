export type EventLevel = 'info' | 'warn' | 'error';

export interface SimEvent {
  t: number;
  level: EventLevel;
  text: string;
  tags: string[];
}
