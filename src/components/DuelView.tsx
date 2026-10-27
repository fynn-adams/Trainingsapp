import { useEffect, useRef, useState } from 'react';
import type { Seasons } from '../App';
import { ATHLETE_IDS, ATHLETES } from '../config';
import type { AthleteId } from '../data/types';
import { isoWeek, parseDay } from '../lib/dates';
import { fmtDayShort, fmtHours, fmtMinutes, fmtPercent } from '../lib/format';
import type { PlanWeek } from '../lib/plan';
import { DuelBars } from './DuelBars';

function topRoundedBar(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function DuelView({ seasons }: { seasons: Seasons }) {
  const current = seasons.fynn.currentIndex;
  const thisWeek = { fynn: seasons.fynn.weeks[current], louisa: seasons.louisa.weeks[current] };
  const pastIdx = seasons.fynn.weeks.filter((w) => w.status === 'past').map((w) => w.index);

  const stats = Object.fromEntries(
    ATHLETE_IDS.map((id) => {
      const weeks = pastIdx.map((i) => seasons[id].weeks[i]).filter((w) => w.completion !== null);
      const avg = weeks.length ? weeks.reduce((s, w) => s + w.completion!, 0) / weeks.length : null;
      const minutes = seasons[id].weeks.reduce((s, w) => s + w.trainedMinutes, 0);
      return [id, { avg, minutes, wins: 0 }];
    }),
  ) as Record<AthleteId, { avg: number | null; minutes: number; wins: number }>;
  let ties = 0;
  for (const i of pastIdx) {
    const f = seasons.fynn.weeks[i].completion;
    const l = seasons.louisa.weeks[i].completion;
    if (f === null || l === null) continue;
    const rf = Math.round(f * 100);
    const rl = Math.round(l * 100);
    if (rf > rl) stats.fynn.wins++;
    else if (rl > rf) stats.louisa.wins++;
    else ties++;
  }

  return (
    <>
      <section className="section card">
        <div className="section-title" style={{ marginBottom: 14 }}>
          <h2>Diese Woche</h2>
          <span className="small muted">% vom eigenen Plan</span>
        </div>
        <DuelBars weeks={thisWeek} big />
      </section>

      <section className="section">
        <div className="section-title">
          <h2>Saison</h2>
          <span className="small muted">abgeschlossene Wochen</span>
        </div>
        <div className="stats">
          <Stat label="Ø Planerfüllung" values={ATHLETE_IDS.map((id) => [id, stats[id].avg === null ? '–' : fmtPercent(stats[id].avg!)])} />
          <Stat
            label={`Wochen gewonnen${ties ? ` (${ties}× Remis)` : ''}`}
            values={ATHLETE_IDS.map((id) => [id, String(stats[id].wins)])}
          />
          <Stat label="Trainingszeit gesamt" values={ATHLETE_IDS.map((id) => [id, fmtHours(stats[id].minutes)])} />
        </div>
      </section>

      <section className="section card">
        <div className="section-title">
          <h2>Wochenverlauf</h2>
        </div>
        <HistoryChart weeks={{ fynn: seasons.fynn.weeks.slice(0, current + 1), louisa: seasons.louisa.weeks.slice(0, current + 1) }} />
      </section>
    </>
  );
}

function Stat({ label, values }: { label: string; values: [AthleteId, string][] }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="values">
        {values.map(([id, v]) => (
          <span key={id} className="row" style={{ gap: 6 }}>
            <span className="dot" style={{ background: ATHLETES[id].color }} aria-hidden="true" />
            <span className="sr-only">
              {ATHLETES[id].name}:
            </span>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

const BAR_W = 11;
const GAP = 2;
const GROUP_W = BAR_W * 2 + GAP + 12;
const H = 160;
const PAD_TOP = 8;
const PAD_LEFT = 34;
const PAD_BOTTOM = 22;

function HistoryChart({ weeks }: { weeks: Record<AthleteId, PlanWeek[]> }) {
  const n = weeks.fynn.length;
  const width = PAD_LEFT + n * GROUP_W + 4;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [n]);

  const y = (v: number) => PAD_TOP + plotH * (1 - v);
  const show = (e: React.MouseEvent | React.FocusEvent, text: string) => {
    const host = scrollRef.current!.parentElement!.getBoundingClientRect();
    const r = (e.currentTarget as Element).getBoundingClientRect();
    setTip({ x: r.left + r.width / 2 - host.left, y: r.top - host.top - 6, text });
  };

  return (
    <div className="chart">
      <div className="chart-legend">
        {ATHLETE_IDS.map((id) => (
          <span className="row" key={id} style={{ gap: 6 }}>
            <span className="dot" style={{ background: ATHLETES[id].color }} />
            {ATHLETES[id].name}
          </span>
        ))}
        <span className="muted tiny" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
          laufende Woche heller
        </span>
      </div>
      <div className="chart-scroll" ref={scrollRef} onScroll={() => setTip(null)}>
        <svg width={width} height={H} role="img" aria-label="Planerfüllung pro Woche, Fynn und Louisa im Vergleich">
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line x1={PAD_LEFT} x2={width} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeWidth={1} />
              <text x={PAD_LEFT - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#858585">
                {v * 100}%
              </text>
            </g>
          ))}
          {weeks.fynn.map((_, i) => {
            const gx = PAD_LEFT + i * GROUP_W + 6;
            const label = `KW ${isoWeek(parseDay(weeks.fynn[i].start))}`;
            return (
              <g key={i}>
                {ATHLETE_IDS.map((id, j) => {
                  const w = weeks[id][i];
                  const c = w.completion;
                  const x = gx + j * (BAR_W + GAP);
                  const text =
                    `${label} · ${ATHLETES[id].name}: ` +
                    (c === null ? 'Pause' : `${fmtPercent(c)} (${fmtMinutes(w.trainedMinutes)})`) +
                    (w.status === 'current' ? ' · läuft' : '');
                  return (
                    <g
                      key={id}
                      tabIndex={0}
                      onMouseEnter={(e) => show(e, text)}
                      onMouseLeave={() => setTip(null)}
                      onFocus={(e) => show(e, text)}
                      onBlur={() => setTip(null)}
                      onClick={(e) => show(e, text)}
                      style={{ outline: 'none', cursor: 'pointer' }}
                    >
                      <rect x={x - 1} y={PAD_TOP} width={BAR_W + 2} height={plotH} fill="transparent" />
                      {c === null ? (
                        <line x1={x} x2={x + BAR_W} y1={y(0) - 1} y2={y(0) - 1} stroke={ATHLETES[id].color} strokeWidth={2} strokeDasharray="2 2" />
                      ) : (
                        <path
                          d={topRoundedBar(x, y(c), BAR_W, plotH * c, 4)}
                          fill={ATHLETES[id].color}
                          opacity={w.status === 'current' ? 0.45 : 1}
                        />
                      )}
                    </g>
                  );
                })}
                {(i % 2 === 0 || n < 12) && (
                  <text x={gx + BAR_W + GAP / 2} y={H - 6} textAnchor="middle" fontSize={10.5} fill="#858585">
                    {fmtDayShort(weeks.fynn[i].start)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {tip && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
      <details className="help" style={{ marginTop: 10 }}>
        <summary className="small">Als Tabelle anzeigen</summary>
        <table className="data" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Woche</th>
              {ATHLETE_IDS.map((id) => (
                <th key={id} className="num">
                  {ATHLETES[id].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.fynn
              .map((w, i) => (
                <tr key={i}>
                  <td>
                    {fmtDayShort(w.start)} (KW {isoWeek(parseDay(w.start))})
                  </td>
                  {ATHLETE_IDS.map((id) => {
                    const c = weeks[id][i].completion;
                    return (
                      <td key={id} className="num">
                        {c === null ? 'Pause' : fmtPercent(c)}
                      </td>
                    );
                  })}
                </tr>
              ))
              .reverse()}
          </tbody>
        </table>
      </details>
    </div>
  );
}
