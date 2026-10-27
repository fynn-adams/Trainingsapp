import { unzipSync } from 'fflate';
import { parseFit } from './fit';
import type { ParsedActivity } from './sport';
import { parseGpx, parseTcx } from './xml';

export type { ParsedActivity } from './sport';

/** Parses a Garmin export (FIT, TCX, GPX or a ZIP from "Original exportieren"). */
export async function parseActivityFile(name: string, data: ArrayBuffer): Promise<ParsedActivity[]> {
  return parseBytes(name, new Uint8Array(data));
}

function parseBytes(name: string, bytes: Uint8Array): ParsedActivity[] {
  const lower = name.toLowerCase();
  if (lower.endsWith('.zip')) {
    const entries = unzipSync(bytes);
    const out: ParsedActivity[] = [];
    for (const [entry, content] of Object.entries(entries)) {
      if (/\.(fit|tcx|gpx)$/i.test(entry)) out.push(...parseBytes(entry.split('/').pop() ?? entry, content));
    }
    if (!out.length) throw new Error('Im ZIP wurde keine FIT-, TCX- oder GPX-Datei gefunden.');
    return out;
  }
  if (lower.endsWith('.fit')) return parseFit(name, bytes);
  const text = new TextDecoder().decode(bytes);
  if (lower.endsWith('.tcx')) return parseTcx(name, text);
  if (lower.endsWith('.gpx')) return parseGpx(name, text);
  throw new Error('Unbekanntes Dateiformat – bitte .fit, .tcx, .gpx oder .zip hochladen.');
}
