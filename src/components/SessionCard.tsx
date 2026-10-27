import { SPORT_LABEL, IconCheck } from './Icons';
import type { Activity } from '../data/types';
import { fmtClock, fmtDateTime, fmtKm, fmtMinutes, fmtPace } from '../lib/format';
import type { SessionResult } from '../lib/plan';

export function ActivitySummary({ a, neutral = false }: { a: Activity; neutral?: boolean }) {
  return (
    <div className={`activity-line ${neutral ? 'neutral' : ''}`}>
      <span>{fmtDateTime(a.startedAt)}</span>
      <span>
        <b>{fmtClock(a.durationS)}</b>
      </span>
      {a.distanceM ? <span>{fmtKm(a.distanceM)}</span> : null}
      {a.distanceM && a.sport === 'run' ? <span>{fmtPace(a.durationS / (a.distanceM / 1000))} /km</span> : null}
      {a.avgHr ? <span>Ø {a.avgHr} bpm</span> : null}
      {a.sport !== 'run' && <span>{SPORT_LABEL[a.sport]}</span>}
    </div>
  );
}

export function SessionCard({ result }: { result: SessionResult }) {
  const { session: s, activities, actualMinutes, done } = result;
  const partial = !done && actualMinutes > 0;
  const pct = Math.round((actualMinutes / s.minutes) * 100);
  return (
    <div className={`card session ${s.required ? '' : 'optional'}`}>
      <div className={`session-check ${done ? 'done' : partial ? 'partial' : ''}`} aria-label={done ? 'erledigt' : partial ? `${pct} % erledigt` : 'offen'}>
        {done ? <IconCheck /> : partial ? `${pct}%` : null}
      </div>
      <div className="grow">
        <div className="row between wrap" style={{ alignItems: 'flex-start' }}>
          <h3>{s.title}</h3>
          <span className="row">
            {!s.required && <span className="chip outline">optional</span>}
            <span className="chip soft-red">{fmtMinutes(s.minutes)}</span>
          </span>
        </div>
        <div className="small muted" style={{ marginTop: 2 }}>
          {s.sports.map((sp) => SPORT_LABEL[sp]).join(' oder ')} · {s.summary}
        </div>
        <ul className="session-steps">
          {s.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        {s.targets.length > 0 && (
          <div className="targets">
            {s.targets.map((t) => (
              <span className="target" key={t.label}>
                <b>{t.label}</b>
                {t.value}
              </span>
            ))}
          </div>
        )}
        {activities.map((a) => (
          <ActivitySummary key={a.id} a={a} />
        ))}
      </div>
    </div>
  );
}
