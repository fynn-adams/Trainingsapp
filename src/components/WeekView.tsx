import { useState } from 'react';
import type { Seasons } from '../App';
import { ATHLETES } from '../config';
import type { AthleteId, WeekFlag } from '../data/types';
import { isoWeek, parseDay } from '../lib/dates';
import { fmtDayShort, fmtMinutes, fmtPace } from '../lib/format';
import { PHASE_LABEL, WEEK_TYPE_LABEL, type PlanWeek } from '../lib/plan';
import { AthleteSwitch } from './AthleteSwitch';
import { DuelBars } from './DuelBars';
import { IconChevronLeft, IconChevronRight } from './Icons';
import { ActivitySummary, SessionCard } from './SessionCard';

interface Props {
  seasons: Seasons;
  athlete: AthleteId;
  onAthlete: (a: AthleteId) => void;
  weekIndex: number;
  onWeekIndex: (i: number) => void;
  onFlag: (flag: WeekFlag) => Promise<void>;
}

const TYPE_HINT: Partial<Record<PlanWeek['type'], string>> = {
  recovery: 'Erholungswoche: weniger Umfang, damit sich der Körper an die letzten Wochen anpasst.',
  comeback: 'Wiedereinstieg nach einer Pause: alles etwas kürzer und lockerer. Danach geht es normal weiter.',
  taper: 'Tapering: Umfang runter, Frische rauf. Jetzt nichts mehr nachholen!',
  race: 'Rennwoche! Locker bleiben, gut schlafen, viel trinken. Ihr seid bereit.',
};

export function WeekView({ seasons, athlete, onAthlete, weekIndex, onWeekIndex, onFlag }: Props) {
  const season = seasons[athlete];
  const total = season.weeks.length;
  const i = Math.min(Math.max(weekIndex, 0), total - 1);
  const week = season.weeks[i];
  const both = { fynn: seasons.fynn.weeks[i], louisa: seasons.louisa.weeks[i] };
  const required = week.sessions.filter((r) => r.session.required);
  const optional = week.sessions.filter((r) => !r.session.required);
  const doneCount = required.filter((r) => r.done).length;

  return (
    <>
      <div className="week-nav">
        <button className="icon-btn" aria-label="Vorherige Woche" disabled={i === 0} onClick={() => onWeekIndex(i - 1)}>
          <IconChevronLeft />
        </button>
        <div className="grow">
          <div className="tiny muted" style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Woche {i + 1} von {total} · KW {isoWeek(parseDay(week.start))}
            {week.status === 'current' ? ' · aktuell' : ''}
          </div>
          <h2>
            {fmtDayShort(week.start)} – {fmtDayShort(week.end)}
          </h2>
        </div>
        <button className="icon-btn" aria-label="Nächste Woche" disabled={i === total - 1} onClick={() => onWeekIndex(i + 1)}>
          <IconChevronRight />
        </button>
      </div>
      {week.status !== 'current' && (
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <button className="btn ghost" onClick={() => onWeekIndex(season.currentIndex)}>
            Zur aktuellen Woche
          </button>
        </div>
      )}

      <section className="section card">
        <div className="section-title" style={{ marginBottom: 14 }}>
          <h2>Wochen-Duell</h2>
          <span className="small muted">% vom eigenen Plan</span>
        </div>
        <DuelBars weeks={both} big />
      </section>

      <section className="section">
        <AthleteSwitch value={athlete} onChange={onAthlete} />
      </section>

      <section className="section">
        <div className="row wrap" style={{ marginBottom: 10 }}>
          <span className="chip red">{PHASE_LABEL[week.phase]}</span>
          <span className="chip">{WEEK_TYPE_LABEL[week.type]}</span>
          {week.plannedMinutes > 0 && <span className="chip outline">{fmtMinutes(week.plannedMinutes)} geplant</span>}
          {week.type !== 'pause' && <span className="chip outline">HM-Form {fmtPace(week.hmPaceS)} /km</span>}
        </div>
        {TYPE_HINT[week.type] && <div className="banner neutral small" style={{ marginBottom: 10 }}>{TYPE_HINT[week.type]}</div>}
        {week.missed && (
          <div className="banner small" style={{ marginBottom: 10 }}>
            Diese Woche wurde als ausgefallen gewertet (unter 34 % geschafft). Der Plan hat sich angepasst: Die nächste Woche
            ist ein Wiedereinstieg und die folgenden Wochen steigern sich etwas schneller, damit {ATHLETES[athlete].name} im
            Oktober trotzdem fit am Start steht.
          </div>
        )}

        {week.type === 'pause' ? (
          <div className="card">
            <h3 style={{ fontSize: 20 }}>Pausenwoche</h3>
            <p className="small muted">
              {week.flag?.note ? `„${week.flag.note}“ – ` : ''}Diese Woche zählt nicht im Duell. Danach startet {ATHLETES[athlete].name}{' '}
              mit einer Wiedereinstiegswoche.
            </p>
          </div>
        ) : (
          <>
            <div className="section-title">
              <h2>Wochenkorb</h2>
              <span className="small muted">
                {doneCount}/{required.length} erledigt · Reihenfolge frei
              </span>
            </div>
            {required.map((r) => (
              <SessionCard key={r.session.key} result={r} />
            ))}
            {optional.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 18 }}>
                  <h2>Bonus</h2>
                </div>
                {optional.map((r) => (
                  <SessionCard key={r.session.key} result={r} />
                ))}
              </>
            )}
          </>
        )}

        {week.extras.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 18 }}>
              <h2>Zusätzlich</h2>
              <span className="small muted">nicht im Plan</span>
            </div>
            <div className="card">
              {week.extras.map((a) => (
                <ActivitySummary key={a.id} a={a} neutral />
              ))}
            </div>
          </>
        )}

        {week.type !== 'taper' && week.type !== 'race' && (
          <PauseControl week={week} athlete={athlete} onFlag={onFlag} />
        )}
      </section>
    </>
  );
}

function PauseControl({ week, athlete, onFlag }: { week: PlanWeek; athlete: AthleteId; onFlag: Props['onFlag'] }) {
  const [note, setNote] = useState(week.flag?.note ?? '');
  const [busy, setBusy] = useState(false);
  const paused = week.type === 'pause';
  const toggle = async () => {
    setBusy(true);
    try {
      await onFlag({ athlete, weekStart: week.start, paused: !paused, note: paused ? null : note.trim() || null });
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="card help" style={{ marginTop: 18 }}>
      <summary>{paused ? 'Pause aufheben' : 'Krank, Urlaub, keine Zeit? Woche pausieren'}</summary>
      <p className="small muted">
        Eine pausierte Woche zählt nicht im Duell. Der Plan nimmt den Trainingsrückstand mit: Es folgt eine
        Wiedereinstiegswoche, und die restlichen Wochen werden neu verteilt.
      </p>
      {!paused && (
        <label className="field" style={{ marginBottom: 10 }}>
          Notiz (optional)
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Erkältung, Urlaub Mallorca" />
        </label>
      )}
      <button className="btn secondary" onClick={toggle} disabled={busy}>
        {paused ? 'Woche wieder aktivieren' : `Woche für ${ATHLETES[athlete].name} pausieren`}
      </button>
    </details>
  );
}
