import type { InferenceResult } from "./types";

export function validateInferenceResult(v: unknown): InferenceResult | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;

  if (typeof o.mood_label !== "string" || !o.mood_label.trim()) return null;
  if (typeof o.confidence !== "number" || o.confidence < 0 || o.confidence > 1)
    return null;
  if (typeof o.weather_metaphor !== "string") return null;
  if (typeof o.notification_line !== "string") return null;
  if (typeof o.deezer_search_query !== "string" || !o.deezer_search_query.trim())
    return null;
  if (typeof o.playlist_title !== "string") return null;
  if (typeof o.playlist_vibe !== "string") return null;
  if (typeof o.creative_nudge !== "string") return null;
  if (typeof o.affirmation_line !== "string") return null;

  let safety: InferenceResult["safety"];
  if (o.safety && typeof o.safety === "object") {
    const s = o.safety as Record<string, unknown>;
    safety = {
      distress_hint: s.distress_hint === true,
      note: typeof s.note === "string" ? s.note : "",
    };
  } else {
    safety = { distress_hint: false, note: "" };
  }

  return {
    mood_label: o.mood_label,
    confidence: o.confidence,
    weather_metaphor: o.weather_metaphor,
    notification_line: o.notification_line,
    deezer_search_query: o.deezer_search_query.trim(),
    playlist_title: o.playlist_title,
    playlist_vibe: o.playlist_vibe,
    creative_nudge: o.creative_nudge,
    affirmation_line: o.affirmation_line,
    safety,
  };
}
