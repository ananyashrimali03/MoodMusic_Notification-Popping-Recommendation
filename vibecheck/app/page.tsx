"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchDeezerPreviews } from "@/lib/deezer";
import {
  clearListeningHistory,
  loadListeningHistory,
  recordPreviewListen,
} from "@/lib/listening";
import { collectSignalsPacket } from "@/lib/signals";
import type { DeezerTrack, InferenceResult } from "@/lib/types";

const PRIVACY_KEY = "vibecheck_demo_privacy_ok_v1";
const DEBOUNCE_MS = 15_000;

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [privacyOk, setPrivacyOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inference, setInference] = useState<InferenceResult | null>(null);
  const [tracks, setTracks] = useState<DeezerTrack[]>([]);
  const [lastRun, setLastRun] = useState<number>(0);
  const [online, setOnline] = useState(true);
  const [listeningCount, setListeningCount] = useState(0);

  const lastInteract = useRef(Date.now());
  const touchActivity = useCallback(() => {
    lastInteract.current = Date.now();
  }, []);

  useEffect(() => {
    setPrivacyOk(window.localStorage.getItem(PRIVACY_KEY) === "1");
    setListeningCount(loadListeningHistory().length);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const syncOnline = () => setOnline(typeof navigator !== "undefined" && navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const w = () => touchActivity();
    window.addEventListener("pointerdown", w, { passive: true });
    window.addEventListener("keydown", w);
    return () => {
      window.removeEventListener("pointerdown", w);
      window.removeEventListener("keydown", w);
    };
  }, [touchActivity]);

  const runCycle = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setErr("You’re offline. Reconnect and try again.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const cycleId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());
      const t0 = performance.now();

      const packet = await collectSignalsPacket({
        lastInteractionAt: lastInteract.current,
      });
      const tSignals = performance.now();

      const cr = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packet }),
      });
      let json: { error?: string; result?: InferenceResult };
      try {
        json = await cr.json();
      } catch {
        throw new Error("Unexpected response from /api/claude.");
      }
      if (!cr.ok)
        throw new Error(
          typeof json.error === "string" ? json.error : "Claude route failed"
        );

      if (!json.result)
        throw new Error("Missing inference result from server.");

      const result = json.result;
      const tClaude = performance.now();

      let list: DeezerTrack[] = [];
      try {
        list = await fetchDeezerPreviews(result.deezer_search_query);
      } catch {
        list = [];
      }
      if (list.length === 0 && result.deezer_search_query) {
        try {
          list = await fetchDeezerPreviews(
            `${result.deezer_search_query} ambient instrumental`
          );
        } catch {
          list = [];
        }
      }
      const tDeezer = performance.now();

      console.table({
        cycle_id: cycleId,
        t_signals_ms: Math.round(tSignals - t0),
        t_claude_ms: Math.round(tClaude - tSignals),
        t_deezer_ms: Math.round(tDeezer - tClaude),
        t_total_ms: Math.round(tDeezer - t0),
        previews: list.length,
      });

      setInference(result);
      setTracks(list);
      setLastRun(Date.now());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (privacyOk) void runCycle();
  }, [privacyOk, runCycle]);

  const cooldownLeft = useMemo(() => {
    if (lastRun === 0) return DEBOUNCE_MS;
    return Math.max(0, DEBOUNCE_MS - (Date.now() - lastRun));
  }, [lastRun, tick]);

  const canReread =
    online &&
    !loading &&
    cooldownLeft === 0 &&
    privacyOk &&
    hydrated &&
    !!inference;

  const pauseOtherAudio = useCallback((current: HTMLAudioElement) => {
    const root = current.closest("[data-track-list]");
    if (!root) return;
    root.querySelectorAll("audio").forEach((a) => {
      if (a !== current) (a as HTMLAudioElement).pause();
    });
  }, []);

  const onPreviewPlay = useCallback((t: DeezerTrack) => {
    recordPreviewListen({
      deezer_track_id: t.id,
      title: t.title,
      artist_name: t.artist.name,
    });
    setListeningCount(loadListeningHistory().length);
  }, []);

  const handleClearListening = useCallback(() => {
    clearListeningHistory();
    setListeningCount(0);
  }, []);

  const acceptPrivacy = () => {
    window.localStorage.setItem(PRIVACY_KEY, "1");
    setPrivacyOk(true);
  };

  return (
    <div className="relative min-h-full bg-[#fff8f0] text-neutral-900">
      <main className="relative z-10 mx-auto flex min-h-full max-w-lg flex-col px-5 pb-16 pt-12">
        {!online && (
          <div className="mb-6 rounded-2xl border-2 border-black bg-[#ffe8e0] px-4 py-3 text-sm text-neutral-900 shadow-[4px_4px_0_0_#000]">
            You’re offline. VibeCheck needs network access for Claude and Deezer.
          </div>
        )}
        <header className="mb-10 rounded-3xl border-2 border-black bg-[#fff4d6] px-5 py-5 shadow-[6px_6px_0_0_#000]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e85d8e]">
            VibeCheck
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
            Reading the room.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">
            Passive signals only—no mood quiz. Claude suggests a sonic doorway;
            Deezer serves 30s previews.
          </p>
        </header>

        {!hydrated && (
          <p className="py-24 text-center text-sm text-neutral-600">Loading…</p>
        )}

        {hydrated && !privacyOk && (
          <div className="rounded-3xl border-2 border-black bg-[#d8f8ee] p-5 shadow-[6px_6px_0_0_#000]">
            <p className="text-sm leading-relaxed text-neutral-800">
              We use your browser clock, optional coarse location for local weather
              (Open-Meteo), and device hints. Tracks you preview here can be stored{" "}
              <strong className="font-semibold text-neutral-900">only on this device</strong>{" "}
              to bias future suggestions—you can clear that anytime from the
              footer. Signal
              JSON is sent to your Claude API route; we don’t run a backend database
              in this demo.
            </p>
            <button
              type="button"
              onClick={acceptPrivacy}
              className="mt-4 w-full rounded-2xl border-2 border-black bg-[#ffb8d9] px-4 py-3 text-sm font-semibold text-neutral-900 shadow-[4px_4px_0_0_#000] transition hover:bg-[#ffa3cf] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000]"
            >
              Continue
            </button>
          </div>
        )}

        {hydrated && privacyOk && loading && !inference && (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="h-12 w-12 animate-pulse rounded-full border-2 border-black bg-[#bfefff]" />
            <p className="text-sm font-medium text-neutral-700">
              Gathering signals…
            </p>
          </div>
        )}

        {err && (
          <div className="rounded-2xl border-2 border-black bg-[#ffd4d4] px-4 py-3 text-sm text-neutral-900 shadow-[4px_4px_0_0_#000]">
            {err}
          </div>
        )}

        {inference && (
          <section className="space-y-8">
            <div className="rounded-3xl border-2 border-black bg-[#ffd6ea] px-5 py-5 shadow-[6px_6px_0_0_#000]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-700">
                Now
              </p>
              <p className="mt-2 text-xl font-semibold leading-snug text-neutral-900">
                {inference.notification_line}
              </p>
              <p className="mt-3 text-sm italic text-neutral-800">
                {inference.weather_metaphor}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border-2 border-black bg-[#fff4d6] px-3 py-1 text-xs font-medium text-neutral-900">
                  {inference.mood_label}
                </span>
                <span className="rounded-full border-2 border-black bg-[#e8deff] px-3 py-1 text-xs font-medium text-neutral-900">
                  confidence {(inference.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <details className="mt-6 rounded-2xl border-2 border-black bg-[#fff0f7] px-4 py-3 text-left [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-[0.15em] text-neutral-700 transition hover:text-neutral-900">
                  <span className="mr-2 inline-block text-[#e85d8e]">▸</span>
                  How Claude used your signals
                </summary>
                <div className="mt-4 space-y-4 border-t-2 border-black pt-4 text-sm leading-relaxed text-neutral-700">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                      Signal read
                    </p>
                    <p className="mt-1 text-neutral-900">
                      {inference.signals_used_for_read}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                      Search strategy
                    </p>
                    <p className="mt-1 text-neutral-900">{inference.deezer_query_why}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                      Moment arc
                    </p>
                    <p className="mt-1 text-neutral-900">{inference.moment_arc}</p>
                  </div>
                </div>
              </details>
            </div>

            <div className="rounded-3xl border-2 border-black bg-[#c9ecff] p-5 shadow-[6px_6px_0_0_#000]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-700">
                Suggested listen
              </p>
              <h2 className="mt-2 text-lg font-bold text-neutral-900">
                {inference.playlist_title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-800">
                {inference.playlist_vibe}
              </p>
              <p className="mt-3 text-xs text-neutral-700">
                Search used:{" "}
                <span className="font-medium text-neutral-900">
                  {inference.deezer_search_query}
                </span>
              </p>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-neutral-700">
                Previews (Deezer)
              </p>
              {tracks.length === 0 ? (
                <p className="rounded-2xl border-2 border-black border-dashed bg-[#faf5eb] px-4 py-6 text-center text-sm text-neutral-600">
                  No previews returned—try Re-read the room.
                </p>
              ) : (
                <ul className="space-y-4" data-track-list>
                  {tracks.map((t) => (
                    <li
                      key={t.id}
                      className="flex gap-3 rounded-2xl border-2 border-black bg-[#dffaf0] p-3 shadow-[4px_4px_0_0_#000]"
                    >
                      {t.album?.cover_medium ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.album.cover_medium}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-xl border-2 border-black object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 shrink-0 rounded-xl border-2 border-black bg-[#fff4d6]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-neutral-900">
                          {t.title}
                        </p>
                        <p className="truncate text-sm text-neutral-700">
                          {t.artist.name}
                        </p>
                        <audio
                          controls
                          className="mt-2 h-8 w-full max-w-full accent-[#e85d8e]"
                          src={t.preview}
                          preload="none"
                          onPlay={(e) => {
                            pauseOtherAudio(e.currentTarget);
                            onPreviewPlay(t);
                          }}
                        />
                        <a
                          href={t.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs font-semibold text-neutral-900 underline decoration-2 underline-offset-2 hover:text-[#e85d8e]"
                        >
                          Open in Deezer
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-3xl border-2 border-black bg-[#fff4b8] p-5 shadow-[6px_6px_0_0_#000]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-700">
                Creative nudge
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-900">
                {inference.creative_nudge}
              </p>
              <p className="mt-4 text-sm text-neutral-800">{inference.affirmation_line}</p>
            </div>

            {inference.safety.distress_hint && (
              <div className="rounded-2xl border-2 border-black bg-[#ffe4a8] p-4 text-sm text-neutral-900 shadow-[4px_4px_0_0_#000]">
                If you’re in immediate danger, contact local emergency services.
                This demo does not provide crisis care.
              </div>
            )}

            <button
              type="button"
              disabled={!canReread}
              onClick={() => {
                touchActivity();
                void runCycle();
              }}
              className="w-full rounded-2xl border-2 border-black bg-white py-3 text-sm font-semibold text-neutral-900 shadow-[4px_4px_0_0_#000] transition enabled:hover:bg-[#faf5eb] disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-500 disabled:shadow-none"
            >
              {loading
                ? "Reading…"
                : !canReread
                  ? `Re-read available in ${Math.ceil(cooldownLeft / 1000)}s`
                  : "Re-read the room"}
            </button>
          </section>
        )}

        <footer className="mt-auto space-y-4 rounded-3xl border-2 border-black border-dashed bg-[#faf5eb] px-4 py-5 pt-8 text-center text-[11px] leading-relaxed text-neutral-700">
          <p>
            On-device previews logged:{" "}
            <span className="font-semibold text-neutral-900">{listeningCount}</span>
            {" · "}
            <button
              type="button"
              onClick={handleClearListening}
              className="font-semibold text-neutral-900 underline decoration-2 decoration-black underline-offset-2 hover:text-[#e85d8e]"
            >
              Clear listening history
            </button>
          </p>
          <p>
            Demo build — contextual inference only, not clinical advice.
            <br />
            Requires{" "}
            <code className="rounded border border-black bg-white px-1 py-0.5 font-mono text-neutral-900">
              ANTHROPIC_API_KEY
            </code>{" "}
            in{" "}
            <code className="rounded border border-black bg-white px-1 py-0.5 font-mono text-neutral-900">
              .env.local
            </code>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
