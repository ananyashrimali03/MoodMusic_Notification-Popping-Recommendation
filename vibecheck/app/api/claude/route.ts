import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { friendlyAnthropicMessage, isLikelyInvalidKey } from "@/lib/anthropic-errors";
import { extractFirstJsonObject } from "@/lib/json";
import { validateInferenceResult } from "@/lib/inference";
import type { InferenceResult, SignalsPacket } from "@/lib/types";

const SYSTEM = `You are VibeCheck, a non-clinical creative assistant. You receive a JSON "SignalsPacket" with passive context (time, weather, device, browser visibility, listening history, limitations). You do NOT diagnose medical or mental health conditions.

Output ONLY valid JSON (no markdown fences) with exactly these keys:
mood_label (string, short)
confidence (number from 0 to 1)
weather_metaphor (string, poetic but non-clinical)
notification_line (string, max 120 chars; tender; no certainty claims about mental health)
signals_used_for_read (string: 2–4 sentences—which packet fields mattered and how; mention limitations[] when something was missing)
deezer_query_why (string: 2–3 sentences—why these search keywords; reference listening history when non-empty)
moment_arc (string: 1–3 sentences—how notification_line, weather_metaphor, and creative_nudge fit one scene)
deezer_search_query (string, 3–8 English keyword tokens for a music catalog search)
playlist_title (string, original title you invent)
playlist_vibe (string, 2–4 sentences)
creative_nudge (string, one tiny creative act, under 220 chars)
affirmation_line (string, one permissive sentence, not cheesy)
safety (object): distress_hint (boolean), note (short string; may be empty)

If listening.recent_plays is empty, ignore taste. Set distress_hint false unless unavoidable; with no user free text it should almost always be false.`;

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is empty. Edit vibecheck/.env.local and add your key after = (no quotes). Save and restart npm run dev.",
      },
      { status: 500 }
    );
  }
  if (isLikelyInvalidKey(key)) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY looks like a placeholder. Paste your real sk-ant-… key from console.anthropic.com on one line in .env.local.",
      },
      { status: 400 }
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
    "VALIDATION FAILED. Output ONE JSON object with ALL keys: mood_label, confidence, weather_metaphor, notification_line, signals_used_for_read, deezer_query_why, moment_arc, deezer_search_query, playlist_title, playlist_vibe, creative_nudge, affirmation_line, safety (distress_hint, note). No markdown fences.";

  async function inferOnce(system: string): Promise<InferenceResult | null> {
    const res = await client.messages.create({
      model,
      max_tokens: 1400,
      temperature: 0.58,
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
    const raw = e instanceof Error ? e.message : String(e);
    const message = friendlyAnthropicMessage(raw);
    const status =
      raw.includes("401") || raw.toLowerCase().includes("authentication")
        ? 401
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
