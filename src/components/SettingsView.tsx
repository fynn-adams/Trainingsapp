import { useState } from 'react';
import { ATHLETE_IDS, ATHLETES, HM_KM, PLAN_START, RACE_DATE, RACE_NAME } from '../config';
import { supabase } from '../data/supabaseStore';
import type { AthleteId, AthleteSettings } from '../data/types';
import { fmtClock, fmtDayShort, fmtPace, parsePace } from '../lib/format';
import { MISS_THRESHOLD, DONE_THRESHOLD } from '../lib/plan';

interface Props {
  settings: Record<AthleteId, AthleteSettings>;
  local: boolean;
  onSave: (s: AthleteSettings) => Promise<void>;
}

export function SettingsView({ settings, local, onSave }: Props) {
  return (
    <>
      <section className="section">
        <div className="section-title">
          <h2>Ziele &amp; Profil</h2>
        </div>
        {ATHLETE_IDS.map((id) => (
          <AthleteForm key={id + settings[id].goalPaceS + settings[id].currentPaceS + settings[id].hrMax} s={settings[id]} onSave={onSave} />
        ))}
      </section>

      <section className="section card small">
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>So funktioniert die App</h2>
        <ul style={{ paddingLeft: 18, margin: 0, color: 'var(--ink-2)' }}>
          <li>
            {RACE_NAME} am {fmtDayShort(RACE_DATE)}.2027 · Planstart {fmtDayShort(PLAN_START)}.2026.
          </li>
          <li>
            Jede Woche gibt es einen <b>Wochenkorb</b>. Die Einheiten könnt ihr an beliebigen Tagen erledigen. Hochgeladene
            Garmin-Aktivitäten werden automatisch zugeordnet: der längste Lauf zum langen Lauf, Radeinheiten zu Zone 2.
          </li>
          <li>
            Eine Einheit gilt ab {Math.round(DONE_THRESHOLD * 100)} % der geplanten Zeit als erledigt, darunter zählt sie
            anteilig. Die <b>Planerfüllung</b> ist die geschaffte Zeit der Pflicht-Einheiten geteilt durch die geplante Zeit,
            maximal 100 %. Mehr trainieren bringt also keine Punkte, Dranbleiben schon.
          </li>
          <li>
            Bleibt eine vergangene Woche unter {Math.round(MISS_THRESHOLD * 100)} %, oder pausiert ihr sie, passt sich der
            Plan an: Es folgt eine Wiedereinstiegswoche, und die restlichen Wochen steigern sich etwas schneller (maximal
            +50 % pro Woche gegenüber dem normalen Plan).
          </li>
          <li>Jede 4. Woche ist eine Erholungswoche. Die letzten zwei Wochen vor dem Rennen sind Tapering.</li>
        </ul>
      </section>

      <section className="section card small">
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Konto</h2>
        {local ? (
          <p className="muted" style={{ margin: 0 }}>
            Lokaler Modus: Alle Daten liegen nur in diesem Browser. Für den gemeinsamen Wettkampf in Vercel die Variablen
            VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY setzen (siehe README).
          </p>
        ) : (
          <button className="btn secondary" onClick={() => supabase?.auth.signOut()}>
            Abmelden
          </button>
        )}
      </section>
    </>
  );
}

function AthleteForm({ s, onSave }: { s: AthleteSettings; onSave: Props['onSave'] }) {
  const [current, setCurrent] = useState(fmtPace(s.currentPaceS));
  const [goal, setGoal] = useState(fmtPace(s.goalPaceS));
  const [hrMax, setHrMax] = useState(s.hrMax ? String(s.hrMax) : '');
  const [busy, setBusy] = useState(false);
  const currentS = parsePace(current);
  const goalS = parsePace(goal);
  const hr = hrMax.trim() ? Number(hrMax) : null;
  const hrValid = hr === null || (Number.isInteger(hr) && hr >= 150 && hr <= 230);
  const valid = currentS !== null && goalS !== null && goalS <= currentS + 60 && hrValid;
  const a = ATHLETES[s.athlete];

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="dot" style={{ background: a.color }} />
        <h3 style={{ fontSize: 22 }}>{a.name}</h3>
        <span className="chip outline">VO₂max {a.vo2max}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="field">
          HM-Form heute (min/km)
          <input className="input" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <span className="tiny muted">{currentS ? `≈ ${fmtClock(currentS * HM_KM)}` : 'Format 7:15'}</span>
        </label>
        <label className="field">
          Ziel-Pace (min/km)
          <input className="input" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <span className="tiny muted">{goalS ? `Zielzeit ${fmtClock(goalS * HM_KM)}` : 'Format 6:30'}</span>
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          Maximalpuls (optional, für bpm-Angaben)
          <input className="input" inputMode="numeric" value={hrMax} placeholder="z. B. 195" onChange={(e) => setHrMax(e.target.value)} />
        </label>
      </div>
      <button
        className="btn"
        style={{ marginTop: 12 }}
        disabled={!valid || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onSave({ athlete: s.athlete, currentPaceS: currentS!, goalPaceS: goalS!, hrMax: hr });
          } finally {
            setBusy(false);
          }
        }}
      >
        Speichern
      </button>
    </div>
  );
}
