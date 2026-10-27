import { useEffect, useMemo, useState } from 'react';
import { ATHLETE_IDS, RACE_DATE } from './config';
import { useAppData } from './data/useAppData';
import { useAuth } from './data/useAuth';
import type { AthleteId, WeekFlag } from './data/types';
import { diffDays, parseDay } from './lib/dates';
import { buildSeason, type Season } from './lib/plan';
import { ActivitiesView } from './components/ActivitiesView';
import { DuelView } from './components/DuelView';
import { IconDuel, IconGear, IconList, IconPlan, IconUpload, IconWeek } from './components/Icons';
import { Login } from './components/Login';
import { PlanView } from './components/PlanView';
import { SettingsView } from './components/SettingsView';
import { UploadDialog } from './components/UploadDialog';
import { WeekView } from './components/WeekView';

export type Seasons = Record<AthleteId, Season>;
type Tab = 'week' | 'plan' | 'duel' | 'acts' | 'settings';

const TABS: { id: Tab; label: string; icon: () => React.JSX.Element }[] = [
  { id: 'week', label: 'Woche', icon: IconWeek },
  { id: 'plan', label: 'Plan', icon: IconPlan },
  { id: 'duel', label: 'Duell', icon: IconDuel },
  { id: 'acts', label: 'Einheiten', icon: IconList },
  { id: 'settings', label: 'Profil', icon: IconGear },
];

function usePref<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(`hm-pref-${key}`) as T | null) ?? fallback;
    } catch {
      return fallback;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(`hm-pref-${key}`, v);
    } catch {
      /* private mode */
    }
  };
  return [value, set];
}

export default function App() {
  const auth = useAuth();
  if (auth === undefined) return <div className="spinner" />;
  if (auth === null) return <Login />;
  return <Main local={auth === 'local'} />;
}

function Main({ local }: { local: boolean }) {
  const { data, error, mutate } = useAppData(true);
  const [tab, setTab] = useState<Tab>('week');
  const [athlete, setAthlete] = usePref<AthleteId>('athlete', 'fynn');
  const [weekIndex, setWeekIndex] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const today = useMemo(() => new Date(), [data]);
  const seasons = useMemo<Seasons | null>(() => {
    if (!data) return null;
    return Object.fromEntries(
      ATHLETE_IDS.map((a) => [
        a,
        buildSeason(a, { activities: data.activities, weekFlags: data.weekFlags, settings: data.settings[a] }, today),
      ]),
    ) as Seasons;
  }, [data, today]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const daysToRace = diffDays(today, parseDay(RACE_DATE));
  const selectedWeek = weekIndex ?? seasons?.fynn.currentIndex ?? 0;

  const setFlag = async (flag: WeekFlag) => {
    await mutate((s) => s.setWeekFlag(flag));
  };

  return (
    <div className="app">
      <header className="hero">
        <div className="container hero-inner">
          <div>
            <div className="hero-kicker">Fynn &amp; Louisa · Generali Köln</div>
            <h1>Halbmarathon 2027</h1>
          </div>
          <div className="countdown" aria-label={`Noch ${daysToRace} Tage bis zum Rennen`}>
            <strong>{Math.max(0, daysToRace)}</strong>
            <span>Tage bis 03.10.</span>
          </div>
        </div>
      </header>

      <main className="container">
        {local && tab !== 'settings' && (
          <div className="banner neutral section small">
            Lokaler Modus: Daten werden nur in diesem Browser gespeichert. Für den gemeinsamen Wettkampf Supabase verbinden
            (siehe README).
          </div>
        )}
        {error && <div className="banner section">Fehler beim Laden: {error}</div>}
        {!seasons || !data ? (
          !error && <div className="spinner" />
        ) : (
          <>
            {tab === 'week' && (
              <WeekView
                seasons={seasons}
                athlete={athlete}
                onAthlete={setAthlete}
                weekIndex={selectedWeek}
                onWeekIndex={setWeekIndex}
                onFlag={setFlag}
              />
            )}
            {tab === 'plan' && (
              <PlanView
                seasons={seasons}
                settings={data.settings}
                athlete={athlete}
                onAthlete={setAthlete}
                onOpenWeek={(i) => {
                  setWeekIndex(i);
                  setTab('week');
                  window.scrollTo(0, 0);
                }}
              />
            )}
            {tab === 'duel' && <DuelView seasons={seasons} />}
            {tab === 'acts' && (
              <ActivitiesView
                activities={data.activities}
                seasons={seasons}
                onUpdate={(id, patch) => mutate((s) => s.updateActivity(id, patch))}
                onDelete={(id) => mutate((s) => s.deleteActivity(id))}
              />
            )}
            {tab === 'settings' && (
              <SettingsView
                settings={data.settings}
                local={local}
                onSave={async (s) => {
                  await mutate((st) => st.saveSettings(s));
                  setToast('Gespeichert – der Plan wurde neu berechnet.');
                }}
              />
            )}
          </>
        )}
      </main>

      {tab !== 'settings' && (
        <button className="btn fab" onClick={() => setUploadOpen(true)}>
          <IconUpload /> Upload
        </button>
      )}

      <nav className="tabbar" aria-label="Navigation">
        <div className="tabbar-inner">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`tab ${tab === id ? 'active' : ''}`}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => {
                setTab(id);
                if (id === 'week') setWeekIndex(null);
                window.scrollTo(0, 0);
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {uploadOpen && (
        <UploadDialog
          defaultAthlete={athlete}
          onClose={() => setUploadOpen(false)}
          onSave={async (items) => {
            const res = await mutate((s) => s.addActivities(items));
            setUploadOpen(false);
            setToast(
              `${res.added.length} Einheit${res.added.length === 1 ? '' : 'en'} gespeichert` +
                (res.duplicates ? `, ${res.duplicates} schon vorhanden` : ''),
            );
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
