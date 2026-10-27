import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ATHLETE_IDS, defaultSettings } from '../config';
import type { DataStore } from './store';
import type { Activity, AppData, AthleteId, AthleteSettings, NewActivity, Sport, WeekFlag } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

interface ActivityRow {
  id: string;
  athlete: AthleteId;
  started_at: string;
  sport: Sport;
  duration_s: number;
  distance_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
  title: string | null;
  file_name: string | null;
  assigned_session: string | null;
  manual: boolean;
}

const fromRow = (r: ActivityRow): Activity => ({
  id: r.id,
  athlete: r.athlete,
  startedAt: new Date(r.started_at).toISOString(),
  sport: r.sport,
  durationS: r.duration_s,
  distanceM: r.distance_m == null ? null : Number(r.distance_m),
  avgHr: r.avg_hr,
  maxHr: r.max_hr,
  calories: r.calories,
  title: r.title,
  fileName: r.file_name,
  assignedSession: r.assigned_session,
  manual: r.manual,
});

const toRow = (a: NewActivity): Omit<ActivityRow, 'id'> => ({
  athlete: a.athlete,
  started_at: a.startedAt,
  sport: a.sport,
  duration_s: a.durationS,
  distance_m: a.distanceM,
  avg_hr: a.avgHr,
  max_hr: a.maxHr,
  calories: a.calories,
  title: a.title,
  file_name: a.fileName,
  assigned_session: a.assignedSession,
  manual: a.manual,
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function createSupabaseStore(client: SupabaseClient): DataStore {
  return {
    mode: 'supabase',
    async load(): Promise<AppData> {
      const [acts, flags, settings] = await Promise.all([
        client.from('activities').select('*').order('started_at'),
        client.from('week_flags').select('*'),
        client.from('athlete_settings').select('*'),
      ]);
      const settingsMap = Object.fromEntries(ATHLETE_IDS.map((a) => [a, defaultSettings(a)])) as Record<
        AthleteId,
        AthleteSettings
      >;
      for (const s of check(settings) as {
        athlete: AthleteId;
        current_pace_s: number;
        goal_pace_s: number;
        hr_max: number | null;
      }[]) {
        settingsMap[s.athlete] = {
          athlete: s.athlete,
          currentPaceS: s.current_pace_s,
          goalPaceS: s.goal_pace_s,
          hrMax: s.hr_max,
        };
      }
      return {
        activities: (check(acts) as ActivityRow[]).map(fromRow),
        weekFlags: (check(flags) as { athlete: AthleteId; week_start: string; paused: boolean; note: string | null }[]).map(
          (f) => ({ athlete: f.athlete, weekStart: f.week_start, paused: f.paused, note: f.note }),
        ),
        settings: settingsMap,
      };
    },
    async addActivities(items) {
      if (!items.length) return { added: [], duplicates: 0 };
      const rows = check(
        await client
          .from('activities')
          .upsert(items.map(toRow), { onConflict: 'athlete,started_at', ignoreDuplicates: true })
          .select('*'),
      ) as ActivityRow[];
      return { added: rows.map(fromRow), duplicates: items.length - rows.length };
    },
    async updateActivity(id, patch) {
      const row: Partial<ActivityRow> = {};
      if (patch.sport !== undefined) row.sport = patch.sport;
      if (patch.assignedSession !== undefined) row.assigned_session = patch.assignedSession;
      check(await client.from('activities').update(row).eq('id', id));
    },
    async deleteActivity(id) {
      check(await client.from('activities').delete().eq('id', id));
    },
    async setWeekFlag(flag: WeekFlag) {
      check(
        await client
          .from('week_flags')
          .upsert({ athlete: flag.athlete, week_start: flag.weekStart, paused: flag.paused, note: flag.note }),
      );
    },
    async saveSettings(s) {
      check(
        await client.from('athlete_settings').upsert({
          athlete: s.athlete,
          current_pace_s: s.currentPaceS,
          goal_pace_s: s.goalPaceS,
          hr_max: s.hrMax,
          updated_at: new Date().toISOString(),
        }),
      );
    },
  };
}
