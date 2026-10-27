import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../../config';
import type { Activity, AthleteId } from '../../data/types';
import { addDays, dayKey, parseDay } from '../dates';
import { buildSeason, matchWeek, planWeekCount, type PlannedSession } from '../plan';

let n = 0;
function act(athlete: AthleteId, day: string, minutes: number, sport: Activity['sport'] = 'run'): Activity {
  return {
    id: String(++n),
    athlete,
    startedAt: new Date(`${day}T08:00:00`).toISOString(),
    sport,
    durationS: minutes * 60,
    distanceM: null,
    avgHr: null,
    maxHr: null,
    calories: null,
    title: null,
    fileName: null,
    assignedSession: null,
    manual: false,
  };
}

const input = (athlete: AthleteId, activities: Activity[] = [], weekFlags = []) => ({
  activities,
  weekFlags,
  settings: defaultSettings(athlete),
});

describe('season', () => {
  it('spans from plan start to race week', () => {
    const s = buildSeason('fynn', input('fynn'), parseDay('2026-10-27'));
    expect(planWeekCount()).toBe(49);
    expect(s.weeks[0].start).toBe('2026-10-26');
    expect(s.weeks.at(-1)!.start).toBe('2027-09-27');
    expect(s.weeks.at(-1)!.sessions.some((r) => r.session.kind === 'race')).toBe(true);
    expect(s.currentIndex).toBe(0);
  });

  it('peaks before the taper when everything is done', () => {
    // Simulate "today" after the race with every week fully completed.
    const acts: Activity[] = [];
    let probe = buildSeason('louisa', input('louisa'), parseDay('2026-10-01'));
    for (const w of probe.weeks) {
      w.sessions.forEach((r, i) => acts.push(act('louisa', dayKey(addDays(parseDay(w.start), i)), r.session.minutes, r.session.sports[0])));
    }
    probe = buildSeason('louisa', input('louisa', acts), parseDay('2027-10-10'));
    const peak = probe.weeks[probe.weeks.length - 4];
    expect(peak.level).toBeGreaterThan(0.95);
    expect(probe.weeks.every((w) => !w.missed)).toBe(true);
    expect(probe.weeks.filter((w) => w.type === 'recovery').length).toBeGreaterThan(8);
    const longest = Math.max(...probe.weeks.flatMap((w) => w.sessions.filter((r) => r.session.key === 'long').map((r) => r.session.minutes)));
    expect(longest).toBe(145);
  });

  it('adapts after a missed week with a comeback week', () => {
    const s = buildSeason('fynn', input('fynn'), parseDay('2026-11-10'));
    // Week 1 (26.10.) is past with no activities → missed.
    expect(s.weeks[0].missed).toBe(true);
    expect(s.weeks[1].type).toBe('comeback');
    expect(s.weeks[1].level).toBe(0);
  });

  it('treats paused weeks as neutral for the competition', () => {
    const s = buildSeason(
      'louisa',
      { ...input('louisa'), weekFlags: [{ athlete: 'louisa', weekStart: '2026-11-02', paused: true, note: 'Urlaub' }] },
      parseDay('2026-11-04'),
    );
    expect(s.weeks[1].type).toBe('pause');
    expect(s.weeks[1].completion).toBeNull();
    expect(s.weeks[2].type).toBe('comeback');
  });
});

describe('matching', () => {
  const sessions: PlannedSession[] = [
    { key: 'q', kind: 'quality', title: 'Q', sports: ['run'], minutes: 45, required: true, summary: '', steps: [], targets: [] },
    { key: 'long', kind: 'long', title: 'L', sports: ['run'], minutes: 80, required: true, summary: '', steps: [], targets: [] },
    { key: 'z2', kind: 'z2', title: 'Z', sports: ['bike'], minutes: 60, required: true, summary: '', steps: [], targets: [] },
    { key: 'opt', kind: 'flex', title: 'O', sports: ['bike', 'run'], minutes: 50, required: false, summary: '', steps: [], targets: [] },
  ];

  it('puts the longest run on the long run and bikes on Z2', () => {
    const { results, extras } = matchWeek(sessions, [
      act('fynn', '2026-11-02', 35),
      act('fynn', '2026-11-04', 75),
      act('fynn', '2026-11-05', 55, 'bike'),
      act('fynn', '2026-11-06', 30, 'bike'),
      act('fynn', '2026-11-07', 20, 'other'),
    ]);
    const by = Object.fromEntries(results.map((r) => [r.session.key, r]));
    expect(by.long.activities[0].durationS).toBe(75 * 60);
    expect(by.long.done).toBe(true); // 75 ≥ 85 % of 80
    expect(by.long.creditedMinutes).toBe(80);
    expect(by.q.creditedMinutes).toBe(35); // below 85 % → partial credit
    expect(by.z2.activities[0].durationS).toBe(55 * 60);
    expect(by.opt.activities[0].durationS).toBe(30 * 60);
    expect(extras).toHaveLength(1);
  });

  it('respects manual assignments', () => {
    const a = { ...act('fynn', '2026-11-02', 90), assignedSession: 'q' };
    const b = { ...act('fynn', '2026-11-03', 30), assignedSession: 'extra' };
    const { results, extras } = matchWeek(sessions, [a, b]);
    expect(results.find((r) => r.session.key === 'q')!.activities).toEqual([a]);
    expect(results.find((r) => r.session.key === 'long')!.activities).toEqual([]);
    expect(extras).toEqual([b]);
  });
});

describe('matching a single short run', () => {
  it('prefers the session with the closest planned time', () => {
    const sessions: PlannedSession[] = [
      { key: 'q', kind: 'easy', title: 'Q', sports: ['run'], minutes: 35, required: true, summary: '', steps: [], targets: [] },
      { key: 'long', kind: 'long', title: 'L', sports: ['run'], minutes: 55, required: true, summary: '', steps: [], targets: [] },
    ];
    const { results } = matchWeek(sessions, [act('fynn', '2026-10-26', 22)]);
    expect(results.find((r) => r.session.key === 'q')!.activities).toHaveLength(1);
  });
});
