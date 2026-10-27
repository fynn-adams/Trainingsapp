import { Encoder, Profile, type FileIdMesg, type SessionMesg } from '@garmin/fitsdk';
import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { parseFit } from '../parse/fit';
import { parseActivityFile } from '../parse';

function makeFit(sport: SessionMesg['sport'], subSport: SessionMesg['subSport']): Uint8Array {
  const start = new Date('2026-10-26T06:43:00Z');
  const encoder = new Encoder();
  const fileId: FileIdMesg = { manufacturer: 'garmin', product: 1, timeCreated: start, type: 'activity' };
  const session: SessionMesg = {
    timestamp: new Date(start.getTime() + 4767_000),
    startTime: start,
    sport,
    subSport,
    totalElapsedTime: 4800,
    totalTimerTime: 4767,
    totalDistance: 10070,
    avgHeartRate: 160,
    maxHeartRate: 178,
    totalCalories: 646,
  };
  encoder.onMesg(Profile.MesgNum.FILE_ID, fileId);
  encoder.onMesg(Profile.MesgNum.SESSION, session);
  return encoder.close();
}

describe('FIT', () => {
  it('reads a running session', () => {
    const [a] = parseFit('run.fit', makeFit('running', 'generic'));
    expect(a.sport).toBe('run');
    expect(a.durationS).toBe(4767);
    expect(a.distanceM).toBe(10070);
    expect(a.avgHr).toBe(160);
    expect(a.calories).toBe(646);
    expect(a.startedAt).toBe('2026-10-26T06:43:00.000Z');
  });

  it('detects indoor cycling and unpacks Garmin ZIP exports', async () => {
    const zip = zipSync({ '123456789_ACTIVITY.fit': makeFit('cycling', 'indoorCycling') });
    const [a] = await parseActivityFile('export.zip', zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer);
    expect(a.sport).toBe('bike');
    expect(a.fileName).toBe('123456789_ACTIVITY.fit');
  });
});
