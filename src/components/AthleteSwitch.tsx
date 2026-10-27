import { ATHLETE_IDS, ATHLETES } from '../config';
import type { AthleteId } from '../data/types';

export function AthleteSwitch({ value, onChange }: { value: AthleteId; onChange: (a: AthleteId) => void }) {
  return (
    <div className="segmented" role="tablist" aria-label="Person">
      {ATHLETE_IDS.map((id) => (
        <button key={id} role="tab" aria-selected={value === id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>
          <span className="dot" style={{ background: ATHLETES[id].color }} />
          {ATHLETES[id].name}
        </button>
      ))}
    </div>
  );
}
