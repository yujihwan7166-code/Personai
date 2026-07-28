import type { GoalColor, GoalStatus, PlannerGoal, PlannerMilestone } from '@/types/planner';
import { PLANNER_GOAL_CHANGED } from '@/types/planner';

const GOALS_KEY = 'planner.goals.v1';
const MILESTONES_KEY = 'planner.goal.milestones.v1';

const safeRead = <T,>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = <T,>(key: string, value: T[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(PLANNER_GOAL_CHANGED));
  } catch {
    /* silent */
  }
};

const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const nextOrder = <T extends { order: number }>(items: T[]) =>
  items.length > 0 ? Math.max(...items.map((item) => item.order)) + 1 : 0;

const normalize = (value: string) => value.trim().toLocaleLowerCase('ko-KR');

export const goalStore = {
  list(): PlannerGoal[] {
    return [...safeRead<PlannerGoal>(GOALS_KEY)].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  },

  listActive(): PlannerGoal[] {
    return this.list().filter((goal) => goal.status === 'active');
  },

  find(id: string): PlannerGoal | undefined {
    return safeRead<PlannerGoal>(GOALS_KEY).find((goal) => goal.id === id);
  },

  findByTitle(title: string): PlannerGoal | undefined {
    const needle = normalize(title);
    return this.list().find((goal) => normalize(goal.title) === needle);
  },

  add(input: { title: string; color?: GoalColor; status?: GoalStatus; dueDate?: string; description?: string }): PlannerGoal {
    const all = safeRead<PlannerGoal>(GOALS_KEY);
    const next: PlannerGoal = {
      id: newId('goal'),
      title: input.title.trim(),
      color: input.color ?? 'blue',
      status: input.status ?? 'active',
      dueDate: input.dueDate,
      description: input.description?.trim() || undefined,
      order: nextOrder(all),
      createdAt: new Date().toISOString(),
    };
    safeWrite(GOALS_KEY, [...all, next]);
    return next;
  },

  update(id: string, patch: Partial<Omit<PlannerGoal, 'id' | 'createdAt'>>): void {
    const all = safeRead<PlannerGoal>(GOALS_KEY);
    const idx = all.findIndex((goal) => goal.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    safeWrite(GOALS_KEY, all);
  },

  remove(id: string): void {
    safeWrite(GOALS_KEY, safeRead<PlannerGoal>(GOALS_KEY).filter((goal) => goal.id !== id));
    safeWrite(MILESTONES_KEY, safeRead<PlannerMilestone>(MILESTONES_KEY).filter((milestone) => milestone.goalId !== id));
  },

  /** 지운 목표를 마일스톤까지 그대로 되돌린다. id 를 유지하므로 작업의 goalId 재연결도 맞는다. */
  restore(goal: PlannerGoal, milestones: PlannerMilestone[] = []): void {
    const goals = safeRead<PlannerGoal>(GOALS_KEY);
    if (!goals.some((g) => g.id === goal.id)) safeWrite(GOALS_KEY, [...goals, goal]);
    const all = safeRead<PlannerMilestone>(MILESTONES_KEY);
    const missing = milestones.filter((m) => !all.some((x) => x.id === m.id));
    if (missing.length) safeWrite(MILESTONES_KEY, [...all, ...missing]);
  },

  listMilestones(goalId?: string): PlannerMilestone[] {
    return safeRead<PlannerMilestone>(MILESTONES_KEY)
      .filter((milestone) => !goalId || milestone.goalId === goalId)
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  },

  findMilestone(id: string): PlannerMilestone | undefined {
    return safeRead<PlannerMilestone>(MILESTONES_KEY).find((milestone) => milestone.id === id);
  },

  addMilestone(input: { goalId: string; title: string; dueDate?: string; done?: boolean }): PlannerMilestone {
    const all = safeRead<PlannerMilestone>(MILESTONES_KEY);
    const siblings = all.filter((milestone) => milestone.goalId === input.goalId);
    const next: PlannerMilestone = {
      id: newId('mile'),
      goalId: input.goalId,
      title: input.title.trim(),
      done: input.done ?? false,
      dueDate: input.dueDate,
      order: nextOrder(siblings),
      createdAt: new Date().toISOString(),
    };
    safeWrite(MILESTONES_KEY, [...all, next]);
    return next;
  },

  updateMilestone(id: string, patch: Partial<Omit<PlannerMilestone, 'id' | 'goalId' | 'createdAt'>>): void {
    const all = safeRead<PlannerMilestone>(MILESTONES_KEY);
    const idx = all.findIndex((milestone) => milestone.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    safeWrite(MILESTONES_KEY, all);
  },

  removeMilestone(id: string): void {
    safeWrite(MILESTONES_KEY, safeRead<PlannerMilestone>(MILESTONES_KEY).filter((milestone) => milestone.id !== id));
  },

  clear(): void {
    safeWrite(GOALS_KEY, []);
    safeWrite(MILESTONES_KEY, []);
  },
};
