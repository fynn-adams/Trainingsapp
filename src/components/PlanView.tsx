import type { Seasons } from '../App';
import { ATHLETES, HM_KM } from '../config';
import type { AthleteId, AthleteSettings } from '../data/types';
import { isoWeek, parseDay } from '../lib/dates';
import { fmtClock, fmtDayShort, fmtMinutes, fmtPace, fmtPercent } from '../lib/format';
import { PHASE_LABEL, WEEK_TYPE_LABEL, zonesFor, type Phase, type PlanWeek } from '../lib/plan';
import { AthleteSwitch } from './AthleteSwitch';

const PHASE_TEXT: Record<Phase, string> = {
  grundlage: 'Ruhige Kilometer, langer Lauf wächst langsam. Ziel: Sehnen, Knochen und Herz an regelmäßiges Training gewöhnen.',
  aufbau: 'Intervalle und Schwellenläufe kommen dazu. Der lange Lauf geht Richtung 1,5–2 Stunden.',
  spezifisch: 'Renntempo trainieren: HM-Tempo-Blöcke und lange Läufe mit schnellem Finish.',
  taper: 'Umfang runter, Frische rauf.',
  rennwoche: 'Köln ruft!',
};

interface Props {
  seasons: Seasons;
  settings: Record<AthleteId, AthleteSettings>;
  athlete: AthleteId;
  onAthlete: (a: AthleteId) => void;
  onOpenWeek: (index: number) => void;
}

export function PlanView({ seasons, settings, athlete, onAthlete, onOpenWeek }: Props) {
  const season = seasons[athlete];
  const s = settings[athlete];
  const current = season.weeks[season.currentIndex];
  const z = zonesFor(current.hmPaceS);
  const groups: { phase: Phase; weeks: PlanWeek[] }[] = [];
  for (const w of season.weeks) {
    const last = groups.at(-1);
    if (last && last.phase === w.phase) last.weeks.push(w);
    else groups.push({ phase: w.phase, weeks: [w] });
  }

  return (
    <>
      <section className="section">
        <AthleteSwitch value={athlete} onChange={onAthlete} />
      </section>

      <section className="section card">
        <div className="row between wrap">
          <div>
            <div className="tiny muted" style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Ziel {ATHLETES[athlete].name}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, lineHeight: 1 }}>
              {fmtClock(s.goalPaceS * HM_KM)}
            </div>
            <div className="small">{fmtPace(s.goalPaceS)} /km</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny muted" style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Start-Form
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, lineHeight: 1.1 }}>
              {fmtClock(s.currentPaceS * HM_KM)}
            </div>
            <div className="small muted">{fmtPace(s.currentPaceS)} /km</div>
          </div>
        </div>
        <div className="targets" style={{ marginTop: 12 }}>
          <span className="target">
            <b>Locker</b>
            {fmtPace(z.easy[0])}–{fmtPace(z.easy[1])}
          </span>
          <span className="target">
            <b>Schwelle</b>
            {fmtPace(z.tempo[0])}–{fmtPace(z.tempo[1])}
          </span>
          <span className="target">
            <b>HM-Tempo</b>
            {fmtPace(current.hmPaceS)}
          </span>
          <span className="target">
            <b>Intervall</b>
            {fmtPace(z.interval[0])}–{fmtPace(z.interval[1])}
          </span>
        </div>
        <p className="tiny muted" style={{ marginBottom: 0 }}>
          Tempobereiche der aktuellen Woche. Sie werden mit dem Trainingsfortschritt Woche für Woche schneller.
        </p>
      </section>

      {groups.map((g) => (
        <section key={g.phase + g.weeks[0].index}>
          <div className="phase-head">
            <span className="chip red">{PHASE_LABEL[g.phase]}</span>
            <span className="small muted">
              {fmtDayShort(g.weeks[0].start)} – {fmtDayShort(g.weeks.at(-1)!.end)}
            </span>
          </div>
          <p className="small muted" style={{ margin: '0 0 8px' }}>
            {PHASE_TEXT[g.phase]}
          </p>
          {g.weeks.map((w) => (
            <button
              key={w.index}
              className={`plan-week ${w.status === 'current' ? 'current' : ''} ${w.type}`}
              onClick={() => onOpenWeek(w.index)}
            >
              <div className="wk">
                {w.index + 1}
                <small>KW {isoWeek(parseDay(w.start))}</small>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="row wrap" style={{ gap: 6 }}>
                  <strong className="small">{fmtDayShort(w.start)}</strong>
                  {w.type !== 'build' && <span className="chip">{WEEK_TYPE_LABEL[w.type]}</span>}
                  {w.missed && <span className="chip soft-red">ausgefallen</span>}
                </div>
                <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.sessions
                    .filter((r) => r.session.required)
                    .map((r) => r.session.title)
                    .join(' · ') || 'Pause'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="small" style={{ fontWeight: 700 }}>
                  {w.type === 'pause'
                    ? '–'
                    : w.completion !== null && w.status !== 'future'
                      ? fmtPercent(w.completion)
                      : fmtMinutes(w.plannedMinutes)}
                </div>
                {w.completion !== null && w.status !== 'future' && (
                  <div className="mini-bar">
                    <div style={{ width: `${w.completion * 100}%`, background: ATHLETES[athlete].color }} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </section>
      ))}
    </>
  );
}
