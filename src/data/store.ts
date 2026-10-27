import type { Activity, AppData, AthleteSettings, NewActivity, WeekFlag } from './types';

export interface AddResult {
  added: Activity[];
  duplicates: number;
}

export interface DataStore {
  mode: 'supabase' | 'local';
  load(): Promise<AppData>;
  addActivities(items: NewActivity[]): Promise<AddResult>;
  updateActivity(id: string, patch: Partial<Pick<Activity, 'sport' | 'assignedSession'>>): Promise<void>;
  deleteActivity(id: string): Promise<void>;
  setWeekFlag(flag: WeekFlag): Promise<void>;
  saveSettings(settings: AthleteSettings): Promise<void>;
}
