import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractFirstJsonObject } from "@/lib/json";
import { validateInferenceResult } from "@/lib/inference";
import type { InferenceResult, SignalsPacket } from "@/lib/types";

const SYSTEM = `You are VibeCheck, a non-clinical creative assistant. You receive a JSON "SignalsPacket" with passive context (time, weather, device, browser visibility, etc.) and optional listening history (may be empty).
You do NOT diagnose medical or mental health conditions. You infer a soft, literary "vibe" for music plus one small creative nudge.
Output ONLY valid JSON (no markdown fences) with exactly these keys:
mood_label (string, short)
confidence (number from 0 to 1)
weather_metaphor (string, poetic but non-clinical)
notification_line (string, max 120 chars; tender; no certainty claims about the user's mental health)
deezer_search_query (string, 3-8 English keyword tokens—genres, moods, instruments—optimized for a music catalog keyword search)
playlist_title (string, original title you invent)
playlist_vibe (string, 2-3 sentences)
creative_nudge (string, one tiny creative act, under 220 chars)
affirmation_line (string, one permissive sentence, not cheesy)
safety (object): distress_hint (boolean), note (short string; may be empty)
listening.recent_plays may be empty—ignore if so. Set distress_hint to false unless impossible otherwise; with no user free text it should almost always be false.`;

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local." },
      { status: 500 }
    );
  }

  let body: { packet: SignalsPacket };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const packet = body.packet;
  if (!packet?.collected_at_iso) {
    return NextResponse.json({ error: "Missing SignalsPacket" }, { status: 400 });
  }

  const model =
    process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022";

  const client = new Anthropic({ apiKey: key });
  const userContent = `SignalsPacket JSON:\n${JSON.stringify(packet)}`;

  const RETRY_HINT =
    "Your previous reply could not be validated. Output ONLY one JSON object with every required key (mood_label, confidence, weather_metaphor, notification_line, deezer_search_query, playlist_title, playlist_vibe, creative_nudge, affirmation_line, safety.distress_hint). No markdown fences, no prose.";

  async function inferOnce(system: string): Promise<InferenceResult | null> {
    const res = await client.messages.create({
      model,
      max_tokens: 1024,
      temperature: 0.55,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const jsonStr = extractFirstJsonObject(text);
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr) as unknown;
      return validateInferenceResult(parsed);
    } catch {
      return null;
    }
  }

  try {
    let validated = await inferOnce(SYSTEM);
    if (!validated) {
      validated = await inferOnce(`${SYSTEM}\n\n${RETRY_HINT}`);
    }
    if (!validated) {
      return NextResponse.json(
        { error: "Model output failed validation after retry" },
        { status: 502 }
      );
    }

    return NextResponse.json({ result: validated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Claude request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
