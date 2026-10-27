import type { Sport } from '../data/types';

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IconWeek = () => (
  <svg {...base} aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4M7 13h3M7 17h3M14 13h3" /></svg>
);
export const IconPlan = () => (
  <svg {...base} aria-hidden="true"><path d="M4 19V5M4 19h16M8 15l4-5 3 3 5-7" /></svg>
);
export const IconDuel = () => (
  <svg {...base} aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IconList = () => (
  <svg {...base} aria-hidden="true"><path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>
);
export const IconGear = () => (
  <svg {...base} aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
export const IconUpload = () => (
  <svg {...base} aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
);
export const IconCheck = () => (
  <svg {...base} strokeWidth={3} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const IconChevronLeft = () => (
  <svg {...base} aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
);
export const IconChevronRight = () => (
  <svg {...base} aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
);
export const IconClose = () => (
  <svg {...base} aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
);
export const IconTrash = () => (
  <svg {...base} aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
);
export const IconRun = () => (
  <svg {...base} aria-hidden="true"><circle cx="14" cy="4" r="2" /><path d="M7 21l3-6 3 2v4M6 12l2-4 5-1 3 4 3 1M10 15l2-6" /></svg>
);
export const IconBike = () => (
  <svg {...base} aria-hidden="true"><circle cx="5.5" cy="17" r="3.5" /><circle cx="18.5" cy="17" r="3.5" /><path d="M5.5 17l4-8h5l4 8M9.5 9L8 6H6M14.5 9l-3 8" /></svg>
);
export const IconOther = () => (
  <svg {...base} aria-hidden="true"><path d="M6 12h12M6 8v8M18 8v8M3 10v4M21 10v4" /></svg>
);

export const SportIcon = ({ sport }: { sport: Sport }) =>
  sport === 'run' ? <IconRun /> : sport === 'bike' ? <IconBike /> : <IconOther />;

export const SPORT_LABEL: Record<Sport, string> = { run: 'Laufen', bike: 'Rad', other: 'Sonstiges' };
