import { useMemo, useState } from 'react';
import type { Seasons } from '../App';
import { ATHLETE_IDS, ATHLETES } from '../config';
import type { Activity, AthleteId, Sport } from '../data/types';
import { fmtClock, fmtDateTime, fmtKm, fmtPace } from '../lib/format';
import type { PlanWeek } from '../lib/plan';
import { IconTrash, SPORT_LABEL, SportIcon } from './Icons';

interface Props {
  activities: Activity[];
  seasons: Seasons;
  onUpdate: (id: string, patch: Partial<Pick<Activity, 'sport' | 'assignedSession'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface Placement {
  week: PlanWeek;
  sessionKey: string | null;
}

export function ActivitiesView({ activities, seasons, onUpdate, onDelete }: Props) {
  const [filter, setFilter] = useState<AthleteId | 'all'>('all');

  const placement = useMemo(() => {
    const map = new Map<string, Placement>();
    for (const id of ATHLETE_IDS) {
      for (const week of seasons[id].weeks) {
        for (const r of week.sessions) for (const a of r.activities) map.set(a.id, { week, sessionKey: r.session.key });
        for (const a of week.extras) map.set(a.id, { week, sessionKey: null });
      }
    }
    return map;
  }, [seasons]);

  const list = activities
    .filter((a) => filter === 'all' || a.athlete === filter)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <>
      <section className="section">
        <div className="segmented">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            Alle
          </button>
          {ATHLETE_IDS.map((id) => (
            <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>
              <span className="dot" style={{ background: ATHLETES[id].color }} />
              {ATHLETES[id].name}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <h2>Einheiten</h2>
          <span className="small muted">{list.length} gespeichert</span>
        </div>
        {list.length === 0 && (
          <div className="card small muted">
            Noch keine Einheiten. Tippe auf „Garmin-Upload“ und lade eure Läufe und Radeinheiten als FIT-Datei hoch.
          </div>
        )}
        {list.map((a) => (
          <ActivityRow key={a.id} a={a} placement={placement.get(a.id)} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </section>
    </>
  );
}

function ActivityRow({
  a,
  placement,
  onUpdate,
  onDelete,
}: {
  a: Activity;
  placement: Placement | undefined;
  onUpdate: Props['onUpdate'];
  onDelete: Props['onDelete'];
}) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  const week = placement?.week;
  const sessions = week?.sessions.map((r) => r.session) ?? [];
  const current = placement?.sessionKey ? sessions.find((s) => s.key === placement.sessionKey) : null;

  return (
    <div className="card act">
      <div className="act-icon" style={{ background: ATHLETES[a.athlete].color }} aria-label={SPORT_LABEL[a.sport]}>
        <SportIcon sport={a.sport} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="row between">
          <strong>
            {ATHLETES[a.athlete].name} · {SPORT_LABEL[a.sport]}
            {a.manual ? ' (manuell)' : ''}
          </strong>
          <span className="tiny muted">{fmtDateTime(a.startedAt)}</span>
        </div>
        <div className="act-metrics">
          <span>
            <b>{fmtClock(a.durationS)}</b>
          </span>
          {a.distanceM ? <span>{fmtKm(a.distanceM)}</span> : null}
          {a.distanceM && a.sport === 'run' ? <span>{fmtPace(a.durationS / (a.distanceM / 1000))} /km</span> : null}
          {a.avgHr ? <span>Ø {a.avgHr} bpm</span> : null}
          {a.calories ? <span>{a.calories} kcal</span> : null}
        </div>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          {!week
            ? 'Außerhalb des Plans (vor Planstart)'
            : current
              ? `Woche ${week.index + 1} → ${current.title}${a.assignedSession ? '' : ' (automatisch)'}`
              : `Woche ${week.index + 1} → zusätzlich, nicht im Plan`}
        </div>
        <div className="act-controls">
          <select
            className="input"
            value={a.sport}
            disabled={busy}
            aria-label="Sportart"
            onChange={(e) => run(() => onUpdate(a.id, { sport: e.target.value as Sport }))}
          >
            {(['run', 'bike', 'other'] as Sport[]).map((s) => (
              <option key={s} value={s}>
                {SPORT_LABEL[s]}
              </option>
            ))}
          </select>
          {week && (
            <select
              className="input"
              value={a.assignedSession ?? ''}
              disabled={busy}
              aria-label="Zuordnung zur Planeinheit"
              onChange={(e) => run(() => onUpdate(a.id, { assignedSession: e.target.value || null }))}
            >
              <option value="">Automatisch zuordnen</option>
              {sessions.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.title}
                </option>
              ))}
              <option value="extra">Zusätzlich (nicht im Plan)</option>
            </select>
          )}
          <button
            className="icon-btn"
            aria-label="Einheit löschen"
            disabled={busy}
            onClick={() => {
              if (confirm('Diese Einheit wirklich löschen?')) void run(() => onDelete(a.id));
            }}
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}
