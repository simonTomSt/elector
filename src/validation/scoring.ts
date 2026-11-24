import type { Requirement, Task } from '@/domain/types';
import type { ValidationResult } from '@/validation/live';

export interface ScoreItem {
  id: string;
  text: string;
  ok: boolean;
  detail?: string;
}

export interface ScorePenalties {
  loto: number;
  hints: number;
}

export interface Score {
  value: number;
  max: number;
  passed: boolean;
  items: ScoreItem[];
  penalties: ScorePenalties;
}

export interface ScoreInputs {
  lotoIncidents: number;
  hintsUsed: number;
}

const MAX = 100;

export const computeScore = (
  task: Task,
  validation: ValidationResult,
  inputs: ScoreInputs,
): Score => {
  const reqs: readonly Requirement[] = task.requirements;
  const issueById = new Map(validation.issues.map((i) => [i.requirementId, i] as const));
  const items: ScoreItem[] = reqs.map((r) => {
    const issue = issueById.get(r.id);
    const item: ScoreItem = { id: r.id, text: r.text, ok: !issue };
    if (issue?.detail) item.detail = issue.detail;
    return item;
  });

  const perItem = reqs.length > 0 ? MAX / reqs.length : 0;
  const base = items.filter((i) => i.ok).length * perItem;

  const lotoPenalty = task.scoring?.lotoPenalty ?? 0;
  const hintPenalty = task.scoring?.hintPenalty ?? 0;
  const lotoCost = lotoPenalty * inputs.lotoIncidents;
  const hintCost = hintPenalty * inputs.hintsUsed;

  const raw = base - lotoCost - hintCost;
  const value = Math.max(0, Math.round(raw));
  const passed = items.length > 0 && items.every((i) => i.ok) && value === MAX;

  return {
    value,
    max: MAX,
    passed,
    items,
    penalties: { loto: lotoCost, hints: hintCost },
  };
};
