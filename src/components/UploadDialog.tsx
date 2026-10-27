import { useEffect, useState } from 'react';
import { ATHLETES } from '../config';
import type { AthleteId, NewActivity, Sport } from '../data/types';
import { fmtClock, fmtDateTime, fmtKm, fmtPace } from '../lib/format';
import type { ParsedActivity } from '../lib/parse';
import { AthleteSwitch } from './AthleteSwitch';
import { IconClose, IconTrash, SPORT_LABEL } from './Icons';

interface Props {
  defaultAthlete: AthleteId;
  onClose: () => void;
  onSave: (items: NewActivity[]) => Promise<void>;
}

const ACCEPTED_FILES = '.fit,.tcx,.gpx,.zip';

const pad = (n: number) => String(n).padStart(2, '0');
const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "45" → 45 min, "1:05:30" → h:mm:ss, "35:10" → mm:ss */
function parseDuration(input: string): number | null {
  const parts = input.trim().split(':').map(Number);
  if (!parts.length || parts.some((p) => Number.isNaN(p) || p < 0)) return null;
  if (parts.length === 1) return parts[0] > 0 ? Math.round(parts[0] * 60) : null;
  if (parts.length === 2) return parts[0] * 60 + parts[1] || null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2] || null;
  return null;
}

export function UploadDialog({ defaultAthlete, onClose, onSave }: Props) {
  const [athlete, setAthlete] = useState<AthleteId>(defaultAthlete);
  const [mode, setMode] = useState<'file' | 'manual'>('file');
  const [items, setItems] = useState<ParsedActivity[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [mDate, setMDate] = useState(nowLocal());
  const [mSport, setMSport] = useState<Sport>('run');
  const [mDuration, setMDuration] = useState('');
  const [mDistance, setMDistance] = useState('');
  const [mHr, setMHr] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const addFiles = async (fileList: FileList) => {
    // Copy first: resetting the input clears the live FileList.
    const files = Array.from(fileList);
    // The FIT SDK is large – only load it when someone actually uploads.
    const { parseActivityFile } = await import('../lib/parse');
    const parsed: ParsedActivity[] = [];
    const errs: string[] = [];
    for (const f of files) {
      try {
        parsed.push(...(await parseActivityFile(f.name, await f.arrayBuffer())));
      } catch (e) {
        errs.push(`${f.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.startedAt));
      return [...prev, ...parsed.filter((p) => !seen.has(p.startedAt))].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    });
    setErrors(errs);
  };

  const manualDuration = parseDuration(mDuration);
  const manualValid = !!manualDuration && !!mDate;

  const save = async () => {
    setBusy(true);
    setSaveError(null);
    try {
      const list: NewActivity[] =
        mode === 'file'
          ? items.map((p) => ({ ...p, athlete, assignedSession: null, manual: false }))
          : [
              {
                athlete,
                startedAt: new Date(mDate).toISOString(),
                sport: mSport,
                durationS: manualDuration!,
                distanceM: mDistance ? Math.round(Number(mDistance.replace(',', '.')) * 1000) || null : null,
                avgHr: mHr ? Number(mHr) || null : null,
                maxHr: null,
                calories: null,
                title: null,
                fileName: null,
                assignedSession: null,
                manual: true,
              },
            ];
      await onSave(list);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="upload-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="upload-title">Einheit hochladen</h2>
          <button className="icon-btn" aria-label="Schließen" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          <div>
            <div className="small muted" style={{ marginBottom: 6, fontWeight: 600 }}>
              Für wen?
            </div>
            <AthleteSwitch value={athlete} onChange={setAthlete} />
          </div>

          <div className="segmented">
            <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>
              Garmin-Datei
            </button>
            <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>
              Manuell
            </button>
          </div>

          {mode === 'file' ? (
            <>
              <label
                className={`dropzone ${drag ? 'drag' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  void addFiles(e.dataTransfer.files);
                }}
              >
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_FILES}
                  onChange={(e) => {
                    if (e.target.files) void addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                Datei(en) auswählen oder hierher ziehen
                <div className="tiny" style={{ fontWeight: 400, marginTop: 4 }}>
                  .fit · .zip (Original-Export) · .tcx · .gpx – Läufe und Ergometer
                </div>
              </label>

              <details className="help">
                <summary>So exportierst du aus Garmin Connect</summary>
                <ol>
                  <li>connect.garmin.com im Browser öffnen (geht auch am Handy) und die Aktivität anklicken.</li>
                  <li>
                    Oben rechts auf das Zahnrad ⚙ tippen → <b>„Original exportieren“</b>. Du bekommst eine ZIP mit der FIT-Datei.
                    Alternativ „In TCX exportieren“.
                  </li>
                  <li>Die ZIP direkt hier auswählen – entpacken ist nicht nötig. Mehrere Dateien auf einmal gehen auch.</li>
                  <li>Ergometer-Einheiten (Indoor-Radfahren) werden automatisch als Rad erkannt.</li>
                </ol>
              </details>

              {errors.map((e) => (
                <div key={e} className="banner small">
                  {e}
                </div>
              ))}

              {items.map((p, idx) => (
                <div className="preview-item" key={p.startedAt}>
                  <div style={{ minWidth: 0 }}>
                    <strong className="small">{fmtDateTime(p.startedAt)}</strong>
                    <div className="act-metrics">
                      <span>
                        <b>{fmtClock(p.durationS)}</b>
                      </span>
                      {p.distanceM ? <span>{fmtKm(p.distanceM)}</span> : null}
                      {p.distanceM && p.sport === 'run' ? <span>{fmtPace(p.durationS / (p.distanceM / 1000))} /km</span> : null}
                      {p.avgHr ? <span>Ø {p.avgHr} bpm</span> : null}
                    </div>
                  </div>
                  <div className="row">
                    <select
                      className="input"
                      style={{ padding: '6px 8px', fontSize: 14 }}
                      aria-label="Sportart"
                      value={p.sport}
                      onChange={(e) =>
                        setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, sport: e.target.value as Sport } : x)))
                      }
                    >
                      {(['run', 'bike', 'other'] as Sport[]).map((s) => (
                        <option key={s} value={s}>
                          {SPORT_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      className="icon-btn"
                      aria-label="Entfernen"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                Start
                <input className="input" type="datetime-local" value={mDate} onChange={(e) => setMDate(e.target.value)} />
              </label>
              <label className="field">
                Sportart
                <select className="input" value={mSport} onChange={(e) => setMSport(e.target.value as Sport)}>
                  {(['run', 'bike', 'other'] as Sport[]).map((s) => (
                    <option key={s} value={s}>
                      {SPORT_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Dauer
                <input className="input" placeholder="45 oder 1:05:30" value={mDuration} onChange={(e) => setMDuration(e.target.value)} />
              </label>
              <label className="field">
                Distanz (km)
                <input className="input" inputMode="decimal" placeholder="optional" value={mDistance} onChange={(e) => setMDistance(e.target.value)} />
              </label>
              <label className="field">
                Ø Puls
                <input className="input" inputMode="numeric" placeholder="optional" value={mHr} onChange={(e) => setMHr(e.target.value)} />
              </label>
              <p className="tiny muted" style={{ gridColumn: '1 / -1', margin: 0 }}>
                Für den Fall, dass die Uhr leer war. Bitte fair bleiben 😉
              </p>
            </div>
          )}

          {saveError && <div className="banner small">Speichern fehlgeschlagen: {saveError}</div>}

          <button
            className="btn block"
            disabled={busy || (mode === 'file' ? items.length === 0 : !manualValid)}
            onClick={save}
          >
            {busy
              ? 'Speichere …'
              : mode === 'file'
                ? `${items.length || ''} Einheit${items.length === 1 ? '' : 'en'} für ${ATHLETES[athlete].name} speichern`
                : `Für ${ATHLETES[athlete].name} speichern`}
          </button>
        </div>
      </div>
    </div>
  );
}
