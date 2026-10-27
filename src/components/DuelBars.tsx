import { ATHLETE_IDS, ATHLETES } from '../config';
import type { AthleteId } from '../data/types';
import { fmtMinutes, fmtPercent } from '../lib/format';
import type { PlanWeek } from '../lib/plan';

/** Head-to-head bars: share of the own weekly plan completed. */
export function DuelBars({ weeks, big = false }: { weeks: Record<AthleteId, PlanWeek>; big?: boolean }) {
  const [a, b] = ATHLETE_IDS;
  const ca = weeks[a].completion;
  const cb = weeks[b].completion;
  const anyData = (ca ?? 0) > 0 || (cb ?? 0) > 0;
  let leader: string;
  if (ca === null || cb === null) leader = 'Eine Pausenwoche – diese Woche zählt nicht im Duell.';
  else if (!anyData) leader = weeks[a].status === 'future' ? 'Diese Woche liegt noch vor euch.' : 'Noch alles offen – wer legt vor?';
  else if (Math.round(ca * 100) === Math.round(cb * 100)) leader = 'Gleichstand! 🤝';
  else leader = `${ATHLETES[ca > cb ? a : b].name} führt diese Woche 🔥`;

  return (
    <div className="duel">
      {ATHLETE_IDS.map((id) => {
        const w = weeks[id];
        const pct = w.completion;
        return (
          <div className="duel-row" key={id}>
            <div className="row between">
              <span className="row">
                <span className="dot" style={{ background: ATHLETES[id].color }} />
                <span className="duel-name">{ATHLETES[id].name}</span>
              </span>
              <span className="row">
                <span className="small muted">
                  {fmtMinutes(w.trainedMinutes)}
                  {w.plannedMinutes ? ` / ${fmtMinutes(w.plannedMinutes)}` : ''}
                </span>
                <span className="duel-value">{pct === null ? 'Pause' : fmtPercent(pct)}</span>
              </span>
            </div>
            <div
              className={`bar-track ${big ? 'big' : ''}`}
              role="meter"
              aria-label={`${ATHLETES[id].name}: Planerfüllung`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct === null ? undefined : Math.round(pct * 100)}
            >
              <div className="bar-fill" style={{ width: `${(pct ?? 0) * 100}%`, background: ATHLETES[id].color }} />
            </div>
          </div>
        );
      })}
      <div className="leader">
        <strong>{leader}</strong>
      </div>
    </div>
  );
}
