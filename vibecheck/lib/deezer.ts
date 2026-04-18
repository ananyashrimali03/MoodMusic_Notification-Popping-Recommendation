import type { DeezerTrack } from "./types";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function dedupeKey(t: DeezerTrack): string {
  return `${norm(t.artist.name)}|${norm(t.title)}`;
}

/** First items with previews, deduped by artist+title, capped. */
export function pickPreviewTracks(rows: DeezerTrack[], target = 6): DeezerTrack[] {
  const seen = new Set<string>();
  const out: DeezerTrack[] = [];
  for (const t of rows) {
    if (!t.preview) continue;
    const k = dedupeKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= target) break;
  }
  return out;
}

export async function fetchDeezerPreviews(query: string): Promise<DeezerTrack[]> {
  const url = `https://api.deezer.com/search/track?q=${encodeURIComponent(query)}&limit=25`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Deezer search failed");
  const json = await res.json();
  const rows: DeezerTrack[] = json?.data ?? [];
  return pickPreviewTracks(rows.filter((t) => t.preview && t.preview.length > 0));
}
