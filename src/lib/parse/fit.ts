import { Decoder, Stream } from '@garmin/fitsdk';
import { mapSport, type ParsedActivity } from './sport';

type FitSession = {
  sport?: string;
  subSport?: string;
  startTime?: Date;
  totalTimerTime?: number;
  totalElapsedTime?: number;
  totalDistance?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  totalCalories?: number;
};

export function parseFit(name: string, bytes: Uint8Array): ParsedActivity[] {
  const stream = Stream.fromByteArray(bytes);
  const decoder = new Decoder(stream);
  if (!decoder.isFIT()) throw new Error(`${name} ist keine gültige FIT-Datei.`);
  const { messages, errors } = decoder.read({ convertDateTimesToDates: true });
  const sessions = (messages.sessionMesgs ?? []) as FitSession[];
  if (!sessions.length) {
    const reason = errors?.length ? ` (${String(errors[0])})` : '';
    throw new Error(`${name} enthält keine Aktivität${reason}.`);
  }
  const sportName = (messages.sportMesgs?.[0] as { name?: string } | undefined)?.name ?? null;

  return sessions
    .filter((s) => s.startTime && (s.totalTimerTime ?? s.totalElapsedTime))
    .map((s) => {
      const sport = s.subSport === 'indoorCycling' || s.subSport === 'spin' ? 'bike' : mapSport(s.sport);
      return {
        startedAt: new Date(s.startTime!).toISOString(),
        sport,
        durationS: Math.round(s.totalTimerTime ?? s.totalElapsedTime ?? 0),
        distanceM: s.totalDistance ? Math.round(s.totalDistance) : null,
        avgHr: s.avgHeartRate ?? null,
        maxHr: s.maxHeartRate ?? null,
        calories: s.totalCalories ?? null,
        title: sportName,
        fileName: name,
      };
    });
}
