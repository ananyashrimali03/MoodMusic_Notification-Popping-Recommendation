import type { DeezerTrack, InferenceResult } from "./types";

export type DemoScene = {
  inference: InferenceResult;
  tracks: DeezerTrack[];
};

/** Royalty-free MP3 examples (SoundHelix). Covers via picsum for stable demo art. */
const mkTrack = (
  id: number,
  title: string,
  artist: string,
  songN: number,
  seed: string
): DeezerTrack => ({
  id,
  title,
  preview: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${songN}.mp3`,
  link: "https://www.soundhelix.com/examples.html",
  duration: 420,
  artist: { name: artist },
  album: {
    cover_medium: `https://picsum.photos/seed/${seed}/256/256`,
    cover_small: `https://picsum.photos/seed/${seed}/128/128`,
  },
});

const SCENES: DemoScene[] = [
  {
    inference: {
      mood_label: "sunlit ease",
      confidence: 0.72,
      weather_metaphor: "open windows, laundry on the line",
      notification_line: "A soft afternoon—something bright without rushing.",
      signals_used_for_read:
        "Demo mode: no live signals. This scene imagines a calm weekend afternoon with warm light and low urgency.",
      deezer_query_why:
        "Scripted pick: upbeat instrumental-adjacent beds that feel airy and uncluttered for a friendly demo.",
      moment_arc:
        "The line sets a gentle pace; the metaphor keeps it sensory; the nudge asks for one small real-world pause.",
      deezer_search_query: "sunny acoustic instrumental light",
      playlist_title: "Window Light / Easy Static",
      playlist_vibe:
        "Think porch hum, soft guitars, nothing that demands focus—music as oxygen, not agenda.",
      creative_nudge: "Step outside for twenty seconds without your phone; notice one sound that isn’t traffic.",
      affirmation_line: "You’re allowed to enjoy a slow hour.",
      safety: { distress_hint: false, note: "" },
    },
    tracks: [
      mkTrack(91001, "SoundHelix Song 2", "T. Schürger (SoundHelix)", 2, "vibe-a"),
      mkTrack(91002, "SoundHelix Song 5", "T. Schürger (SoundHelix)", 5, "vibe-b"),
      mkTrack(91003, "SoundHelix Song 8", "T. Schürger (SoundHelix)", 8, "vibe-c"),
    ],
  },
  {
    inference: {
      mood_label: "quiet focus",
      confidence: 0.68,
      weather_metaphor: "rain steady on glass",
      notification_line: "Head down, world turned low—good night for small steps.",
      signals_used_for_read:
        "Demo mode: scripted scene. Evokes evening focus with cooler tones and softer edges.",
      deezer_query_why:
        "Scripted pick: mellow layers that sit behind thought instead of grabbing the mic.",
      moment_arc:
        "Night-read energy: cozy metaphor, modest hero line, nudge toward one tangible reset.",
      deezer_search_query: "ambient piano rain study",
      playlist_title: "Glasslines / Study Haze",
      playlist_vibe:
        "Low-motion textures for thinking without spiraling—close the tabs you’re scared to close later.",
      creative_nudge: "Write one sentence you’d never post; delete it or keep it—your call.",
      affirmation_line: "Progress can be embarrassingly small and still count.",
      safety: { distress_hint: false, note: "" },
    },
    tracks: [
      mkTrack(92001, "SoundHelix Song 3", "T. Schürger (SoundHelix)", 3, "vibe-d"),
      mkTrack(92002, "SoundHelix Song 6", "T. Schürger (SoundHelix)", 6, "vibe-e"),
      mkTrack(92003, "SoundHelix Song 9", "T. Schürger (SoundHelix)", 9, "vibe-f"),
    ],
  },
  {
    inference: {
      mood_label: "neon drift",
      confidence: 0.65,
      weather_metaphor: "city lights smeared in puddles",
      notification_line: "Late lanes, bass like a heartbeat under tired shoulders.",
      signals_used_for_read:
        "Demo mode: imagined late commute—motion without arrival, energy without caffeine.",
      deezer_query_why:
        "Scripted pick: slightly pulsing electronic moods that match forward motion at night.",
      moment_arc:
        "Pulse-forward vibe; metaphor stays urban; nudge grounds you in breath + rhythm.",
      deezer_search_query: "late night electronic chill drive",
      playlist_title: "Afterhours / Pulse & Patience",
      playlist_vibe:
        "Not a party—more like headphones on a night bus: forward, contained, a little cinematic.",
      creative_nudge: "Sync three breaths to whatever hi-hat you hear—tiny dance, private victory.",
      affirmation_line: "You can move forward without having every answer.",
      safety: { distress_hint: false, note: "" },
    },
    tracks: [
      mkTrack(93001, "SoundHelix Song 4", "T. Schürger (SoundHelix)", 4, "vibe-g"),
      mkTrack(93002, "SoundHelix Song 10", "T. Schürger (SoundHelix)", 10, "vibe-h"),
      mkTrack(93003, "SoundHelix Song 11", "T. Schürger (SoundHelix)", 11, "vibe-i"),
    ],
  },
  {
    inference: {
      mood_label: "gentle reset",
      confidence: 0.7,
      weather_metaphor: "first sip, steam rising",
      notification_line: "Morning honesty: start small, stay kind to your nervous system.",
      signals_used_for_read:
        "Demo mode: warm opening scene—optimistic without hustle-culture poison.",
      deezer_query_why:
        "Scripted pick: soft acoustic-forward moods that feel like sunlight through curtains.",
      moment_arc:
        "Hopeful but not loud: metaphor warms; notification stays tentative; nudge is tiny and bodily.",
      deezer_search_query: "morning acoustic gentle hopeful",
      playlist_title: "Steam & Start / Soft Launch",
      playlist_vibe:
        "Not a productivity sermon—more like permission to begin without a perfect plan.",
      creative_nudge: "Fill a glass of water before the next scroll; notice the temperature.",
      affirmation_line: "Starting messy still counts as starting.",
      safety: { distress_hint: false, note: "" },
    },
    tracks: [
      mkTrack(94001, "SoundHelix Song 7", "T. Schürger (SoundHelix)", 7, "vibe-j"),
      mkTrack(94002, "SoundHelix Song 12", "T. Schürger (SoundHelix)", 12, "vibe-k"),
      mkTrack(94003, "SoundHelix Song 13", "T. Schürger (SoundHelix)", 13, "vibe-l"),
    ],
  },
];

let rotation = 0;

/** Returns the next scripted scene (cycles). Pure client demo — no network for inference. */
export function nextDemoScene(): DemoScene {
  const scene = SCENES[rotation % SCENES.length];
  rotation += 1;
  return scene;
}

export function demoSceneCount(): number {
  return SCENES.length;
}
