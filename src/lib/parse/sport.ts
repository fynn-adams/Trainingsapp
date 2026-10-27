import type { Sport } from '../../data/types';

export interface ParsedActivity {
  startedAt: string;
  sport: Sport;
  durationS: number;
  distanceM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  calories: number | null;
  title: string | null;
  fileName: string;
}

export function mapSport(raw: string | null | undefined): Sport {
  const s = (raw ?? '').toLowerCase();
  if (/run|lauf|walk|hik|treadmill/.test(s)) return 'run';
  if (/cycl|bik|rad|ergo|spin/.test(s)) return 'bike';
  return 'other';
}
