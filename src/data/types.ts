export type AthleteId = 'fynn' | 'louisa';
export type Sport = 'run' | 'bike' | 'other';

export interface Activity {
  id: string;
  athlete: AthleteId;
  /** ISO timestamp (UTC) of the activity start */
  startedAt: string;
  sport: Sport;
  /** Moving/timer time in seconds (Garmin "Gesamtzeit") */
  durationS: number;
  distanceM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  calories: number | null;
  title: string | null;
  fileName: string | null;
  /** Manually assigned plan session key, "extra" for "not part of the plan", null = automatic */
  assignedSession: string | null;
  manual: boolean;
}

export type NewActivity = Omit<Activity, 'id'>;

export interface WeekFlag {
  athlete: AthleteId;
  /** Monday of the week, YYYY-MM-DD */
  weekStart: string;
  paused: boolean;
  note: string | null;
}

export interface AthleteSettings {
  athlete: AthleteId;
  /** Current half marathon fitness as pace in s/km */
  currentPaceS: number;
  /** Goal half marathon pace in s/km */
  goalPaceS: number;
  hrMax: number | null;
}

export interface AppData {
  activities: Activity[];
  weekFlags: WeekFlag[];
  settings: Record<AthleteId, AthleteSettings>;
}
