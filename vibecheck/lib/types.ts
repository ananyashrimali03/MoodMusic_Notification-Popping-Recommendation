/** Minimal contracts for demo — see CMUAI Hack/spec.md for full spec */

export type ListeningPlayRow = {
  played_at_iso: string;
  title: string;
  artist_name: string;
  deezer_track_id?: number;
  genres?: string[];
  play_ratio?: number;
  source?: "local_app";
};

export type SignalsPacket = {
  collected_at_iso: string;
  timezone: string;
  local_time_24h: string;
  day_of_week: string;
  locale: string;
  geo?: {
    lat: number;
    lon: number;
    accuracy_m?: number;
  };
  weather?: {
    condition: string;
    temp_c: number;
    wind_mps: number;
    weather_code?: number;
  };
  device: {
    battery_percent: number | null;
    charging: boolean | null;
    online: boolean;
    ua_mobile: boolean;
  };
  behavior: {
    visibility: string;
    idle_ms_estimate: number;
  };
  listening?: {
    source: string;
    recent_plays: ListeningPlayRow[];
    aggregate_hint?: { top_genres: string[]; notes: string };
  };
  limitations: string[];
};

/** Structured vibe card — populated by scripted demo scenes or future inference */
export type InferenceResult = {
  mood_label: string;
  confidence: number;
  weather_metaphor: string;
  notification_line: string;
  /** Which passive signals mattered most and how they combined (non-clinical). */
  signals_used_for_read: string;
  /** Why these keywords fit the playlist (demo copy). */
  deezer_query_why: string;
  /** How hero line + metaphor + nudge form one coherent moment. */
  moment_arc: string;
  deezer_search_query: string;
  playlist_title: string;
  playlist_vibe: string;
  creative_nudge: string;
  affirmation_line: string;
  safety: { distress_hint: boolean; note?: string };
};

export type DeezerTrack = {
  id: number;
  title: string;
  preview: string;
  link: string;
  duration: number;
  artist: { name: string };
  album?: { cover_medium?: string; cover_small?: string };
};
