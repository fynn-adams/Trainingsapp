import { ATHLETE_IDS, defaultSettings } from '../config';
import type { AddResult, DataStore } from './store';
import type { AppData, AthleteId, AthleteSettings } from './types';

const KEY = 'hm-koeln-data-v1';

function read(): AppData {
  const base: AppData = {
    activities: [],
    weekFlags: [],
    settings: Object.fromEntries(ATHLETE_IDS.map((a) => [a, defaultSettings(a)])) as Record<AthleteId, AthleteSettings>,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      activities: parsed.activities ?? [],
      weekFlags: parsed.weekFlags ?? [],
      settings: { ...base.settings, ...parsed.settings },
    };
  } catch {
    return base;
  }
}

function write(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** Browser-only store used when no Supabase project is configured. */
export const localStore: DataStore = {
  mode: 'local',
  async load() {
    return read();
  },
  async addActivities(items): Promise<AddResult> {
    const data = read();
    const seen = new Set(data.activities.map((a) => `${a.athlete}|${a.startedAt}`));
    const added = [];
    for (const item of items) {
      const k = `${item.athlete}|${item.startedAt}`;
      if (seen.has(k)) continue;
      seen.add(k);
      added.push({ ...item, id: crypto.randomUUID() });
    }
    data.activities.push(...added);
    write(data);
    return { added, duplicates: items.length - added.length };
  },
  async updateActivity(id, patch) {
    const data = read();
    data.activities = data.activities.map((a) => (a.id === id ? { ...a, ...patch } : a));
    write(data);
  },
  async deleteActivity(id) {
    const data = read();
    data.activities = data.activities.filter((a) => a.id !== id);
    write(data);
  },
  async setWeekFlag(flag) {
    const data = read();
    data.weekFlags = [...data.weekFlags.filter((f) => !(f.athlete === flag.athlete && f.weekStart === flag.weekStart)), flag];
    write(data);
  },
  async saveSettings(settings) {
    const data = read();
    data.settings[settings.athlete] = settings;
    write(data);
  },
};
