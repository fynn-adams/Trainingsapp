import { parseDay } from './dates';

const pad = (n: number) => String(n).padStart(2, '0');

/** 4:55 */
export function fmtPace(secondsPerKm: number): string {
  const s = Math.round(secondsPerKm);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

export function fmtPaceRange(lo: number, hi: number): string {
  return `${fmtPace(lo)}–${fmtPace(hi)} /km`;
}

/** 1:19:27 or 34:46 */
export function fmtClock(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** 45 min / 1 h 20 min */
export function fmtMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** 29,4 h – compact for season totals */
export function fmtHours(minutes: number): string {
  return `${(minutes / 60).toLocaleString('de-DE', { maximumFractionDigits: 1 })} h`;
}

export function fmtKm(meters: number): string {
  return `${(meters / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}

export function fmtPercent(fraction: number): string {
  return `${Math.round(fraction * 100)} %`;
}

export function fmtDayShort(key: string | Date): string {
  const d = typeof key === 'string' ? parseDay(key) : key;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Parses "4:40" or "4.40" into seconds; returns null when invalid. */
export function parsePace(input: string): number | null {
  const m = input.trim().match(/^(\d{1,2})[:.,](\d{2})$/);
  if (!m) return null;
  const sec = Number(m[2]);
  if (sec >= 60) return null;
  return Number(m[1]) * 60 + sec;
}
