import { HM_KM, PLAN_START, RACE_DATE } from '../config';
import type { Activity, AthleteId, AthleteSettings, Sport, WeekFlag } from '../data/types';
import { addDays, dayKey, diffDays, mondayOf, parseDay, weekKeyOf } from './dates';
import { fmtPace, fmtPaceRange } from './format';

export type Phase = 'grundlage' | 'aufbau' | 'spezifisch' | 'taper' | 'rennwoche';
export type WeekType = 'build' | 'recovery' | 'comeback' | 'taper' | 'race' | 'pause';
export type WeekStatus = 'past' | 'current' | 'future';
export type SessionKind = 'easy' | 'quality' | 'long' | 'z2' | 'flex' | 'race';

export const PHASE_LABEL: Record<Phase, string> = {
  grundlage: 'Grundlage',
  aufbau: 'Aufbau',
  spezifisch: 'Wettkampfspezifisch',
  taper: 'Tapering',
  rennwoche: 'Rennwoche',
};

export const WEEK_TYPE_LABEL: Record<WeekType, string> = {
  build: 'Belastungswoche',
  recovery: 'Erholungswoche',
  comeback: 'Wiedereinstieg',
  taper: 'Tapering',
  race: 'Rennwoche',
  pause: 'Pause',
};

export interface Target {
  label: string;
  value: string;
}

export interface PlannedSession {
  key: string;
  kind: SessionKind;
  title: string;
  sports: Sport[];
  minutes: number;
  required: boolean;
  summary: string;
  steps: string[];
  targets: Target[];
}

export interface SessionResult {
  session: PlannedSession;
  activities: Activity[];
  actualMinutes: number;
  creditedMinutes: number;
  done: boolean;
}

export interface PlanWeek {
  index: number;
  start: string;
  end: string;
  phase: Phase;
  type: WeekType;
  status: WeekStatus;
  level: number;
  hmPaceS: number;
  sessions: SessionResult[];
  extras: Activity[];
  plannedMinutes: number;
  creditedMinutes: number;
  trainedMinutes: number;
  /** 0..1, null for paused weeks */
  completion: number | null;
  missed: boolean;
  flag: WeekFlag | null;
}

export interface Season {
  athlete: AthleteId;
  weeks: PlanWeek[];
  currentIndex: number;
  /** Activities outside of the plan range */
  outside: Activity[];
}

/** A past week below this completion counts as missed and the plan adapts. */
export const MISS_THRESHOLD = 0.34;
/** A session counts as fully done from this share of its planned time. */
export const DONE_THRESHOLD = 0.85;
const TAPER_WEEKS = 2;
const SPECIFIC_WEEKS = 10;
const BUILD_WEEKS = 16;
const RECOVERY_EVERY = 4;
const BUILD_SHARE = (RECOVERY_EVERY - 1) / RECOVERY_EVERY;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Training level range in which each phase normally runs – used to progress workouts within a phase. */
const PHASE_LEVELS: Partial<Record<Phase, [number, number]>> = {
  aufbau: [0.42, 0.78],
  spezifisch: [0.78, 1],
};
const progressIn = (phase: Phase, level: number) => {
  const range = PHASE_LEVELS[phase];
  return range ? clamp01((level - range[0]) / (range[1] - range[0])) : clamp01(level);
};
const r5 = (minutes: number) => Math.max(5, Math.round(minutes / 5) * 5);

export function planWeekCount(): number {
  return diffDays(parseDay(PLAN_START), mondayOf(parseDay(RACE_DATE))) / 7 + 1;
}

function phaseFor(weeksToRace: number): Phase {
  if (weeksToRace === 0) return 'rennwoche';
  if (weeksToRace <= TAPER_WEEKS) return 'taper';
  if (weeksToRace <= TAPER_WEEKS + SPECIFIC_WEEKS) return 'spezifisch';
  if (weeksToRace <= TAPER_WEEKS + SPECIFIC_WEEKS + BUILD_WEEKS) return 'aufbau';
  return 'grundlage';
}

// ---------------------------------------------------------------------------
// Session templates
// ---------------------------------------------------------------------------

interface AthleteParams {
  long: [number, number];
  easy: [number, number];
  third: [number, number];
  thirdTitle: string;
  thirdSports: Sport[];
  thirdRequiredInBase: boolean;
  optional: { minutes: [number, number]; title: string; sports: Sport[] } | null;
  warmup: number;
  cooldown: number;
  fartlekRest: number;
  intervalRep: number;
  intervalRest: number;
  intervalReps: [number, number];
  tempoBlock: [number, number];
  hmBlock: [number, number];
  specificIntervals: { reps: [number, number]; label: string; repMin: number };
  fastFinish: [number, number];
}

const PARAMS: Record<AthleteId, AthleteParams> = {
  fynn: {
    long: [55, 115],
    easy: [35, 50],
    third: [45, 75],
    thirdTitle: 'Rad Zone 2 (Ergometer)',
    thirdSports: ['bike'],
    thirdRequiredInBase: true,
    optional: { minutes: [40, 60], title: 'Rad Z2 oder lockerer Lauf', sports: ['bike', 'run'] },
    warmup: 15,
    cooldown: 10,
    fartlekRest: 1,
    intervalRep: 4,
    intervalRest: 2,
    intervalReps: [4, 6],
    tempoBlock: [8, 15],
    hmBlock: [15, 25],
    specificIntervals: { reps: [5, 7], label: '1000 m', repMin: 4.5 },
    fastFinish: [15, 25],
  },
  louisa: {
    long: [70, 145],
    easy: [30, 45],
    third: [30, 50],
    thirdTitle: 'Lockerer Lauf oder Rad Z2',
    thirdSports: ['run', 'bike'],
    thirdRequiredInBase: false,
    optional: null,
    warmup: 12,
    cooldown: 10,
    fartlekRest: 2,
    intervalRep: 3,
    intervalRest: 2,
    intervalReps: [4, 6],
    tempoBlock: [6, 12],
    hmBlock: [12, 20],
    specificIntervals: { reps: [4, 6], label: '4 min', repMin: 4 },
    fastFinish: [10, 20],
  },
};

export interface Zones {
  easy: [number, number];
  long: [number, number];
  tempo: [number, number];
  hm: [number, number];
  interval: [number, number];
}

export function zonesFor(hmPaceS: number): Zones {
  const P = hmPaceS;
  return {
    easy: [P * 1.12, P * 1.24],
    long: [P * 1.12, P * 1.22],
    tempo: [P * 0.96, P * 0.99],
    hm: [P - 3, P + 3],
    interval: [P * 0.89, P * 0.92],
  };
}

interface TemplateCtx {
  athlete: AthleteId;
  phase: Phase;
  type: WeekType;
  level: number;
  /** Counts build weeks so far – alternates the key sessions independent of recovery weeks. */
  rotation: number;
  weeksToRace: number;
  hmPaceS: number;
  settings: AthleteSettings;
}

function hrHint(settings: AthleteSettings, lo: number, hi: number): string {
  if (!settings.hrMax) return lo < 0.7 ? 'HF-Zone 2 (Garmin) – Unterhaltung muss möglich sein' : 'HF-Zone 2–3 (Garmin)';
  return `${Math.round(settings.hrMax * lo)}–${Math.round(settings.hrMax * hi)} bpm`;
}

function easyTargets(ctx: TemplateCtx, z: Zones, range: [number, number] = z.easy): Target[] {
  return [
    { label: 'Pace', value: fmtPaceRange(range[0], range[1]) },
    { label: 'Puls', value: hrHint(ctx.settings, 0.65, 0.78) },
  ];
}

function bikeTargets(ctx: TemplateCtx): Target[] {
  return [
    { label: 'Puls', value: hrHint(ctx.settings, 0.6, 0.7) },
    { label: 'Trittfrequenz', value: '85–95 U/min, gleichmäßig' },
  ];
}

function structured(
  key: string,
  title: string,
  summary: string,
  warmup: number,
  main: string[],
  mainMinutes: number,
  cooldown: number,
  targets: Target[],
): PlannedSession {
  return {
    key,
    kind: 'quality',
    title,
    sports: ['run'],
    minutes: r5(warmup + mainMinutes + cooldown),
    required: true,
    summary,
    steps: [`${warmup} min einlaufen (locker)`, ...main, `${cooldown} min auslaufen`],
    targets,
  };
}

function qualitySession(ctx: TemplateCtx, p: AthleteParams, z: Zones): PlannedSession {
  const { phase, type, level: x, rotation, weeksToRace } = ctx;
  const even = rotation % 2 === 0;
  const easyMinutes = r5(lerp(p.easy[0], p.easy[1], x));

  if (type === 'comeback' || type === 'recovery') {
    const minutes = r5(easyMinutes * (type === 'comeback' ? 0.8 : 0.75));
    return {
      key: 'q',
      kind: 'easy',
      title: type === 'comeback' ? 'Lockerer Wiedereinstiegslauf' : 'Lockerer Lauf + Steigerungen',
      sports: ['run'],
      minutes,
      required: true,
      summary:
        type === 'comeback'
          ? 'Ganz locker zurück in den Rhythmus – lieber zu langsam als zu schnell.'
          : 'Entspannt laufen, der Körper verarbeitet die letzten Wochen.',
      steps:
        type === 'comeback'
          ? [`${minutes} min locker`]
          : [`${minutes - 5} min locker`, '4 × 20 s Steigerungen (locker-zügig, voll erholen)'],
      targets: easyTargets(ctx, z),
    };
  }

  if (phase === 'rennwoche') {
    return structured(
      'q',
      'Vorbelastung',
      'Kurz die Beine wecken – nichts mehr trainieren, nur frisch bleiben.',
      15,
      ['3 × 2 min im HM-Renntempo, 2 min Trabpause'],
      10,
      5,
      [{ label: 'HM-Tempo', value: fmtPaceRange(z.hm[0], z.hm[1]) }],
    );
  }

  if (phase === 'taper') {
    if (weeksToRace === 2) {
      return structured(
        'q',
        'HM-Tempo 2 × 10 min',
        'Renntempo verinnerlichen, Umfang sinkt – Qualität bleibt.',
        p.warmup,
        ['2 × 10 min im HM-Renntempo, 3 min Trabpause'],
        23,
        p.cooldown,
        [{ label: 'HM-Tempo', value: fmtPaceRange(z.hm[0], z.hm[1]) }],
      );
    }
    return structured(
      'q',
      'Generalprobe 3 × 1 km',
      'Locker-spritzig: drei Kilometer im Renntempo, danach heim.',
      p.warmup,
      ['3 × 1 km im HM-Renntempo, 2 min Trabpause'],
      Math.round((3 * ctx.hmPaceS) / 60 + 4),
      p.cooldown,
      [{ label: 'HM-Tempo', value: fmtPaceRange(z.hm[0], z.hm[1]) }],
    );
  }

  if (phase === 'grundlage') {
    if (even) {
      return {
        key: 'q',
        kind: 'easy',
        title: 'Lockerer Lauf + Steigerungen',
        sports: ['run'],
        minutes: easyMinutes,
        required: true,
        summary: 'Aerobe Basis aufbauen. Die Steigerungen am Ende halten den Laufstil spritzig.',
        steps: [`${easyMinutes - 5} min locker`, '4–6 × 20 s Steigerungen (locker-zügig, voll erholen)'],
        targets: easyTargets(ctx, z),
      };
    }
    const reps = Math.round(lerp(5, 8, x));
    return structured(
      'q',
      'Fahrtspiel',
      'Spielerisch Tempo wechseln – zügig heißt kontrolliert, nicht Vollgas.',
      p.warmup,
      [`${reps} × 1 min zügig / ${p.fartlekRest} min locker traben`],
      reps * (1 + p.fartlekRest),
      p.cooldown,
      [
        { label: 'zügig', value: fmtPaceRange(z.tempo[0], z.tempo[1]) },
        { label: 'locker', value: fmtPaceRange(z.easy[0], z.easy[1]) },
      ],
    );
  }

  const phaseProgress = progressIn(phase, x);

  if (phase === 'aufbau') {
    if (even) {
      const reps = Math.round(lerp(p.intervalReps[0], p.intervalReps[1], phaseProgress));
      return structured(
        'q',
        `Intervalle ${reps} × ${p.intervalRep} min`,
        'VO₂max-Reiz: hart, aber jede Wiederholung gleich schnell.',
        p.warmup,
        [`${reps} × ${p.intervalRep} min schnell, ${p.intervalRest} min Trabpause`],
        reps * (p.intervalRep + p.intervalRest) - p.intervalRest,
        p.cooldown,
        [{ label: 'Intervall', value: fmtPaceRange(z.interval[0], z.interval[1]) }],
      );
    }
    const block = r5(lerp(p.tempoBlock[0], p.tempoBlock[1], phaseProgress));
    return structured(
      'q',
      `Schwelle 2 × ${block} min`,
      'Tempodauerlauf an der Schwelle – „komfortabel hart“, ganze Sätze gehen nicht mehr.',
      p.warmup,
      [`2 × ${block} min an der Schwelle, 3 min Trabpause`],
      2 * block + 3,
      p.cooldown,
      [{ label: 'Schwelle', value: fmtPaceRange(z.tempo[0], z.tempo[1]) }],
    );
  }

  // spezifisch
  if (even) {
    const block = r5(lerp(p.hmBlock[0], p.hmBlock[1], phaseProgress));
    return structured(
      'q',
      `HM-Tempo 2 × ${block} min`,
      'Das Renntempo muss sich vertraut anfühlen – gleichmäßig, nicht schneller.',
      p.warmup,
      [`2 × ${block} min im HM-Renntempo, 3 min Trabpause`],
      2 * block + 3,
      p.cooldown,
      [{ label: 'HM-Tempo', value: fmtPaceRange(z.hm[0], z.hm[1]) }],
    );
  }
  const si = p.specificIntervals;
  const reps = Math.round(lerp(si.reps[0], si.reps[1], phaseProgress));
  return structured(
    'q',
    `Intervalle ${reps} × ${si.label}`,
    'Tempohärte für die zweite Rennhälfte.',
    p.warmup,
    [`${reps} × ${si.label} schnell, 2 min Trabpause`],
    reps * (si.repMin + 2) - 2,
    p.cooldown,
    [{ label: 'Intervall', value: fmtPaceRange(z.interval[0], z.interval[1]) }],
  );
}

function longSession(ctx: TemplateCtx, p: AthleteParams, z: Zones): PlannedSession | null {
  const { phase, type, level: x, rotation, weeksToRace } = ctx;
  if (phase === 'rennwoche') return null;
  let minutes = lerp(p.long[0], p.long[1], x);
  if (phase === 'taper') minutes = p.long[1] * (weeksToRace === 2 ? 0.7 : 0.5);
  if (type === 'recovery') minutes *= 0.75;
  if (type === 'comeback') minutes *= 0.8;
  minutes = r5(minutes);

  const finish = phase === 'spezifisch' && type === 'build' && rotation % 2 === 1;
  if (finish) {
    const fast = r5(lerp(p.fastFinish[0], p.fastFinish[1], progressIn(phase, x)));
    return {
      key: 'long',
      kind: 'long',
      title: 'Langer Lauf mit HM-Finish',
      sports: ['run'],
      minutes,
      required: true,
      summary: 'Auf müden Beinen ins Renntempo – die beste Vorbereitung auf die letzten Rennkilometer.',
      steps: [`${minutes - fast} min locker`, `${fast} min im HM-Renntempo`],
      targets: [
        { label: 'locker', value: fmtPaceRange(z.long[0], z.long[1]) },
        { label: 'HM-Tempo', value: fmtPaceRange(z.hm[0], z.hm[1]) },
      ],
    };
  }
  return {
    key: 'long',
    kind: 'long',
    title: 'Langer Lauf',
    sports: ['run'],
    minutes,
    required: true,
    summary:
      phase === 'taper'
        ? 'Kürzer als gewohnt – die Form ist da, jetzt Frische tanken.'
        : 'Die wichtigste Einheit der Woche: Ausdauer für 21,1 km. Langsam ist hier richtig.',
    steps: [`${minutes} min gleichmäßig locker`, 'Bei Bedarf Gehpausen – Zeit zählt, nicht Tempo'],
    targets: easyTargets(ctx, z, z.long),
  };
}

function thirdSession(ctx: TemplateCtx, p: AthleteParams, z: Zones): PlannedSession | null {
  const { phase, type, level: x, weeksToRace } = ctx;
  let minutes = lerp(p.third[0], p.third[1], x);
  let required = p.thirdRequiredInBase || phase !== 'grundlage';
  if (phase === 'rennwoche') {
    minutes = 20;
    required = false;
  }
  if (phase === 'taper') minutes = p.third[1] * (weeksToRace === 2 ? 0.7 : 0.55);
  if (type === 'recovery') minutes *= 0.75;
  if (type === 'comeback') minutes *= 0.8;
  minutes = r5(minutes);

  const bikeOnly = p.thirdSports.length === 1 && p.thirdSports[0] === 'bike';
  return {
    key: 'z2',
    kind: bikeOnly ? 'z2' : 'flex',
    title: phase === 'rennwoche' ? 'Locker ausradeln / auslaufen' : p.thirdTitle,
    sports: p.thirdSports,
    minutes,
    required,
    summary: bikeOnly
      ? 'Aerobe Grundlage ohne Stoßbelastung – schont die Schienbeine.'
      : 'Zusätzliche lockere Ausdauer – auf dem Rad, wenn die Beine schwer sind.',
    steps: [`${minutes} min gleichmäßig in Zone 2`],
    targets: bikeOnly ? bikeTargets(ctx) : [...easyTargets(ctx, z).slice(0, 1), ...bikeTargets(ctx).slice(0, 1)],
  };
}

function optionalSession(ctx: TemplateCtx, p: AthleteParams): PlannedSession | null {
  if (!p.optional) return null;
  if (ctx.phase === 'taper' || ctx.phase === 'rennwoche' || ctx.type === 'comeback') return null;
  const minutes = r5(lerp(p.optional.minutes[0], p.optional.minutes[1], ctx.level) * (ctx.type === 'recovery' ? 0.75 : 1));
  return {
    key: 'opt',
    kind: 'flex',
    title: p.optional.title,
    sports: p.optional.sports,
    minutes,
    required: false,
    summary: 'Bonus-Einheit, wenn Zeit und Lust da sind. Zählt nicht in die Planerfüllung.',
    steps: [`${minutes} min locker in Zone 2`],
    targets: bikeTargets(ctx).slice(0, 1),
  };
}

function raceSession(ctx: TemplateCtx): PlannedSession {
  const goal = ctx.settings.goalPaceS;
  const minutes = Math.round((HM_KM * goal) / 60);
  return {
    key: 'race',
    kind: 'race',
    title: '🏁 Halbmarathon Köln',
    sports: ['run'],
    minutes,
    required: true,
    summary: `Renntag! Ziel ${fmtPace(goal)} /km.`,
    steps: [
      `km 1–3: bewusst ruhig, ca. ${fmtPace(goal + 5)} /km – das Gedränge kostet sonst Kraft`,
      `km 4–16: Zielpace ${fmtPace(goal)} /km, an jeder Verpflegung trinken`,
      'ab km 16: was noch im Tank ist – Köln trägt dich ins Ziel',
    ],
    targets: [{ label: 'Zielpace', value: `${fmtPace(goal)} /km` }],
  };
}

export function sessionsFor(ctx: TemplateCtx): PlannedSession[] {
  if (ctx.type === 'pause') return [];
  const p = PARAMS[ctx.athlete];
  const z = zonesFor(ctx.hmPaceS);
  const list = [qualitySession(ctx, p, z), longSession(ctx, p, z), thirdSession(ctx, p, z), optionalSession(ctx, p)];
  if (ctx.phase === 'rennwoche') list.push(raceSession(ctx));
  return list.filter((s): s is PlannedSession => s !== null);
}

// ---------------------------------------------------------------------------
// Matching activities to sessions
// ---------------------------------------------------------------------------

export function matchWeek(
  sessions: PlannedSession[],
  activities: Activity[],
): { results: SessionResult[]; extras: Activity[] } {
  const assigned = new Map<string, Activity[]>(sessions.map((s) => [s.key, []]));
  const extras: Activity[] = [];
  const auto: Activity[] = [];

  for (const a of activities) {
    if (a.assignedSession === 'extra') extras.push(a);
    else if (a.assignedSession && assigned.has(a.assignedSession)) assigned.get(a.assignedSession)!.push(a);
    else auto.push(a);
  }

  // Longest activities first; each goes to the open session whose planned time fits best
  // (required before optional, ties to the longer session), so the longest run lands on the long run.
  auto.sort((a, b) => b.durationS - a.durationS);
  for (const a of auto) {
    const fit = (s: PlannedSession) => Math.abs(Math.log(a.durationS / 60 / s.minutes));
    const candidates = sessions
      .filter((s) => s.sports.includes(a.sport) && assigned.get(s.key)!.length === 0)
      .sort((x, y) => Number(y.required) - Number(x.required) || fit(x) - fit(y) || y.minutes - x.minutes);
    if (candidates.length) assigned.get(candidates[0].key)!.push(a);
    else extras.push(a);
  }

  const results = sessions.map((session) => {
    const acts = assigned.get(session.key)!;
    const actualMinutes = acts.reduce((sum, a) => sum + a.durationS / 60, 0);
    const done = actualMinutes >= session.minutes * DONE_THRESHOLD;
    return {
      session,
      activities: acts,
      actualMinutes,
      creditedMinutes: done ? session.minutes : Math.min(actualMinutes, session.minutes),
      done,
    };
  });
  return { results, extras };
}

// ---------------------------------------------------------------------------
// Season generation (adaptive)
// ---------------------------------------------------------------------------

export interface SeasonInput {
  activities: Activity[];
  weekFlags: WeekFlag[];
  settings: AthleteSettings;
}

/**
 * Builds the whole season week by week. The training level (0 → 1) rises so that it peaks
 * right before the taper. A missed or paused week lowers the level, the following week becomes
 * a comeback week and the remaining weeks are re-spread so the peak is still reached (with a
 * capped weekly increase). Every 4th week is a recovery week.
 */
export function buildSeason(athlete: AthleteId, input: SeasonInput, today: Date = new Date()): Season {
  const start = parseDay(PLAN_START);
  const total = planWeekCount();
  const progressionWeeks = total - 1 - TAPER_WEEKS;
  const nominalStep = 1 / (progressionWeeks * BUILD_SHARE);
  const todayKey = weekKeyOf(today);
  const planEnd = addDays(start, total * 7);

  const byWeek = new Map<string, Activity[]>();
  const outside: Activity[] = [];
  for (const a of input.activities) {
    if (a.athlete !== athlete) continue;
    const d = new Date(a.startedAt);
    if (d < start || d >= planEnd) {
      outside.push(a);
      continue;
    }
    const key = weekKeyOf(d);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(a);
  }
  const flags = new Map(input.weekFlags.filter((f) => f.athlete === athlete).map((f) => [f.weekStart, f]));

  const weeks: PlanWeek[] = [];
  let level = 0;
  let buildStreak = 0;
  let comebackNext = false;
  let rotation = 0;
  let currentIndex = todayKey < dayKey(start) ? 0 : total - 1;

  for (let k = 0; k < total; k++) {
    const weekStart = addDays(start, 7 * k);
    const key = dayKey(weekStart);
    const weeksToRace = total - 1 - k;
    const phase = phaseFor(weeksToRace);
    const flag = flags.get(key) ?? null;
    const status: WeekStatus = key < todayKey ? 'past' : key === todayKey ? 'current' : 'future';
    if (status === 'current') currentIndex = k;

    let type: WeekType;
    if (weeksToRace === 0) type = 'race';
    else if (weeksToRace <= TAPER_WEEKS) type = 'taper';
    else if (flag?.paused) type = 'pause';
    else if (comebackNext) type = 'comeback';
    else if (buildStreak >= RECOVERY_EVERY - 1) type = 'recovery';
    else type = 'build';

    const effectiveLevel = type === 'taper' || type === 'race' ? 1 : level;
    const { currentPaceS, goalPaceS } = input.settings;
    const hmPaceS = Math.round(lerp(currentPaceS, goalPaceS, effectiveLevel));

    const sessions = sessionsFor({
      athlete,
      phase,
      type,
      level: effectiveLevel,
      rotation,
      weeksToRace,
      hmPaceS,
      settings: input.settings,
    });
    const acts = (byWeek.get(key) ?? []).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const { results, extras } = matchWeek(sessions, acts);

    const required = results.filter((r) => r.session.required);
    const plannedMinutes = required.reduce((s, r) => s + r.session.minutes, 0);
    const creditedMinutes = required.reduce((s, r) => s + r.creditedMinutes, 0);
    const trainedMinutes = acts.reduce((s, a) => s + a.durationS / 60, 0);
    const completion = type === 'pause' || plannedMinutes === 0 ? null : Math.min(1, creditedMinutes / plannedMinutes);
    const missed = status === 'past' && completion !== null && completion < MISS_THRESHOLD && type !== 'race';

    weeks.push({
      index: k,
      start: key,
      end: dayKey(addDays(weekStart, 6)),
      phase,
      type,
      status,
      level: effectiveLevel,
      hmPaceS,
      sessions: results,
      extras,
      plannedMinutes,
      creditedMinutes,
      trainedMinutes,
      completion,
      missed,
      flag,
    });

    // Advance the training level for the next week.
    if (type === 'taper' || type === 'race') continue;
    if (type === 'pause' || missed) {
      level = Math.max(0, level - nominalStep);
      comebackNext = true;
      buildStreak = 0;
    } else if (type === 'recovery' || type === 'comeback') {
      comebackNext = false;
      buildStreak = 0;
    } else {
      const remaining = Math.max(1, (progressionWeeks - k) * BUILD_SHARE);
      const step = Math.min((1 - level) / remaining, nominalStep * 1.5);
      level = Math.min(1, level + Math.max(0, step));
      buildStreak++;
      rotation++;
    }
  }

  return { athlete, weeks, currentIndex, outside };
}
