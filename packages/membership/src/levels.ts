import type { Cycle, Level } from './types.ts';

export interface LevelInfo {
  key: Level;
  /** The name in the bylaws (Art. 4). */
  name: string;
  /** Offered on /membership. Enthusiast and Advocate wait for the owner's fees and benefits. */
  offered: boolean;
}

/** Lowest first. The order decides which documents and perks a level sees ("Supporter and up"). */
export const LEVELS: readonly LevelInfo[] = [
  { key: 'basic', name: 'Basic Member', offered: true },
  { key: 'supporter', name: 'Supporter', offered: true },
  { key: 'enthusiast', name: 'Enthusiast', offered: false },
  { key: 'advocate', name: 'Advocate', offered: false },
];

export const LEVEL_KEYS = LEVELS.map((l) => l.key);

export const CYCLE_KEYS: readonly Cycle[] = ['quarterly', 'yearly'];

export const isLevel = (v: unknown): v is Level => typeof v === 'string' && (LEVEL_KEYS as string[]).includes(v);
export const isCycle = (v: unknown): v is Cycle => typeof v === 'string' && (CYCLE_KEYS as string[]).includes(v);

export const levelInfo = (l: Level): LevelInfo => LEVELS.find((x) => x.key === l)!;

/** 0 for Basic, 3 for Advocate. */
export const levelRank = (l: Level): number => LEVEL_KEYS.indexOf(l);

/** True when `level` is `min` or higher. */
export const atLeast = (level: Level, min: Level): boolean => levelRank(level) >= levelRank(min);

/** The Stripe Price lookup key for a level and cycle: `member_basic_quarterly`. */
export const priceLookupKey = (level: Level, cycle: Cycle) => `member_${level}_${cycle}`;
