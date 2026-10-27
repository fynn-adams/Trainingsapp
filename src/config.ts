import type { AthleteId, AthleteSettings } from './data/types';

export const RACE_NAME = 'Generali Köln Halbmarathon';
/** Generali Köln Marathon 2027 – traditionally the first Sunday in October. */
export const RACE_DATE = '2027-10-03';
/** Monday of the first plan week. */
export const PLAN_START = '2026-10-26';
export const HM_KM = 21.0975;

export interface AthleteProfile {
  id: AthleteId;
  name: string;
  color: string;
  vo2max: number;
  defaults: Omit<AthleteSettings, 'athlete'>;
}

export const ATHLETES: Record<AthleteId, AthleteProfile> = {
  fynn: {
    id: 'fynn',
    name: 'Fynn',
    color: '#C8102E',
    vo2max: 53,
    // 5 km in 22:09 (Okt. 2026) ≈ 1:42 h im Halbmarathon → Ziel 4:40 /km ≈ 1:38:27 h
    defaults: { currentPaceS: 292, goalPaceS: 280, hrMax: null },
  },
  louisa: {
    id: 'louisa',
    name: 'Louisa',
    color: '#1E6FD9',
    vo2max: 43,
    // 10 km locker in 7:53–8:18 /km (Okt. 2026) ≈ 2:33 h im Halbmarathon → Ziel 6:30 /km ≈ 2:17:08 h
    defaults: { currentPaceS: 435, goalPaceS: 390, hrMax: null },
  },
};

export const ATHLETE_IDS: AthleteId[] = ['fynn', 'louisa'];

export function defaultSettings(athlete: AthleteId): AthleteSettings {
  return { athlete, ...ATHLETES[athlete].defaults };
}
