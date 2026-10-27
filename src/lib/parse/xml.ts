import { mapSport, type ParsedActivity } from './sport';

function parseXml(text: string, name: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(`${name} konnte nicht gelesen werden.`);
  return doc;
}

const byLocal = (root: Element | Document, local: string) => Array.from(root.getElementsByTagNameNS('*', local));
const firstText = (root: Element | Document, local: string) => byLocal(root, local)[0]?.textContent?.trim() ?? null;
const num = (v: string | null | undefined) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

export function parseTcx(name: string, text: string): ParsedActivity[] {
  const doc = parseXml(text, name);
  return byLocal(doc, 'Activity').map((act) => {
    const laps = byLocal(act, 'Lap');
    let duration = 0;
    let distance = 0;
    let calories = 0;
    let hrWeighted = 0;
    let maxHr = 0;
    for (const lap of laps) {
      const t = num(firstText(lap, 'TotalTimeSeconds')) ?? 0;
      duration += t;
      distance += num(firstText(lap, 'DistanceMeters')) ?? 0;
      calories += num(firstText(lap, 'Calories')) ?? 0;
      const avg = num(byLocal(lap, 'AverageHeartRateBpm')[0]?.textContent?.trim());
      if (avg) hrWeighted += avg * t;
      maxHr = Math.max(maxHr, num(byLocal(lap, 'MaximumHeartRateBpm')[0]?.textContent?.trim()) ?? 0);
    }
    const startedAt = firstText(act, 'Id') ?? laps[0]?.getAttribute('StartTime');
    if (!startedAt || !duration) throw new Error(`${name} enthält keine auswertbare Aktivität.`);
    return {
      startedAt: new Date(startedAt).toISOString(),
      sport: mapSport(act.getAttribute('Sport')),
      durationS: Math.round(duration),
      distanceM: distance ? Math.round(distance) : null,
      avgHr: hrWeighted ? Math.round(hrWeighted / duration) : null,
      maxHr: maxHr || null,
      calories: calories || null,
      title: null,
      fileName: name,
    };
  });
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function parseGpx(name: string, text: string): ParsedActivity[] {
  const doc = parseXml(text, name);
  return byLocal(doc, 'trk').map((trk) => {
    const points = byLocal(trk, 'trkpt');
    let distance = 0;
    let moving = 0;
    let hrSum = 0;
    let hrCount = 0;
    let maxHr = 0;
    let prev: { lat: number; lon: number; t: number } | null = null;
    for (const pt of points) {
      const lat = Number(pt.getAttribute('lat'));
      const lon = Number(pt.getAttribute('lon'));
      const t = Date.parse(firstText(pt, 'time') ?? '');
      const hr = num(firstText(pt, 'hr'));
      if (hr) {
        hrSum += hr;
        hrCount++;
        maxHr = Math.max(maxHr, hr);
      }
      if (Number.isNaN(t)) continue;
      if (prev) {
        const d = haversine(prev.lat, prev.lon, lat, lon);
        const dt = (t - prev.t) / 1000;
        distance += d;
        // Gaps longer than 30 s without movement are treated as pauses.
        if (dt > 0 && !(dt > 30 && d < 10)) moving += dt;
      }
      prev = { lat, lon, t };
    }
    const firstTime = points.map((p) => firstText(p, 'time')).find(Boolean);
    if (!firstTime || !moving) throw new Error(`${name} enthält keine Zeitstempel.`);
    return {
      startedAt: new Date(firstTime).toISOString(),
      sport: mapSport(firstText(trk, 'type')),
      durationS: Math.round(moving),
      distanceM: distance ? Math.round(distance) : null,
      avgHr: hrCount ? Math.round(hrSum / hrCount) : null,
      maxHr: maxHr || null,
      calories: null,
      title: firstText(trk, 'name'),
      fileName: name,
    };
  });
}
