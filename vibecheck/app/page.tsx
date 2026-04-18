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
      const json = await cr.json();
      if (!cr.ok) throw new Error(json.error || "Claude route failed");

      const result = json.result as InferenceResult;
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
    <div className="relative min-h-full bg-[#07080c] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(236,72,153,0.08),_transparent_50%)]" />

      <main className="relative z-10 mx-auto flex min-h-full max-w-lg flex-col px-5 pb-16 pt-12">
        {!online && (
          <div className="mb-6 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            You’re offline. VibeCheck needs network access for Claude and Deezer.
          </div>
        )}
        <header className="mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-300/90">
            VibeCheck
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Reading the room.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Passive signals only—no mood quiz. Claude suggests a sonic doorway;
            Deezer serves 30s previews.
          </p>
        </header>

        {!hydrated && (
          <p className="py-24 text-center text-sm text-zinc-500">Loading…</p>
        )}

        {hydrated && !privacyOk && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-zinc-300">
              We use your browser clock, optional coarse location for local weather
              (Open-Meteo), and device hints. Tracks you preview here can be stored{" "}
              <strong className="font-medium text-zinc-200">only on this device</strong>{" "}
              to bias future suggestions—you can clear that anytime from the
              footer. Signal
              JSON is sent to your Claude API route; we don’t run a backend database
              in this demo.
            </p>
            <button
              type="button"
              onClick={acceptPrivacy}
              className="mt-4 w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-400"
            >
              Continue
            </button>
          </div>
        )}

        {hydrated && privacyOk && loading && !inference && (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="h-10 w-10 animate-pulse rounded-full bg-indigo-500/40" />
            <p className="text-sm text-zinc-400">Gathering signals…</p>
          </div>
        )}

        {err && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        {inference && (
          <section className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Now
              </p>
              <p className="mt-2 text-xl font-medium leading-snug text-white">
                {inference.notification_line}
              </p>
              <p className="mt-3 text-sm italic text-indigo-200/90">
                {inference.weather_metaphor}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200">
                  {inference.mood_label}
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">
                  confidence {(inference.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Suggested listen
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {inference.playlist_title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {inference.playlist_vibe}
              </p>
              <p className="mt-3 text-xs text-zinc-600">
                Search used:{" "}
                <span className="text-zinc-400">
                  {inference.deezer_search_query}
                </span>
              </p>
            </div>

            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">
                Previews (Deezer)
              </p>
              {tracks.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No previews returned—try Re-read the room.
                </p>
              ) : (
                <ul className="space-y-4" data-track-list>
                  {tracks.map((t) => (
                    <li
                      key={t.id}
                      className="flex gap-3 rounded-xl border border-white/5 bg-black/20 p-3"
                    >
                      {t.album?.cover_medium ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.album.cover_medium}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 shrink-0 rounded-lg bg-white/10" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-100">
                          {t.title}
                        </p>
                        <p className="truncate text-sm text-zinc-500">
                          {t.artist.name}
                        </p>
                        <audio
                          controls
                          className="mt-2 h-8 w-full max-w-full"
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
                          className="mt-1 inline-block text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Open in Deezer
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
              <p className="text-xs uppercase tracking-widest text-indigo-300/80">
                Creative nudge
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                {inference.creative_nudge}
              </p>
              <p className="mt-4 text-sm text-zinc-400">{inference.affirmation_line}</p>
            </div>

            {inference.safety.distress_hint && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
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
              className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white transition enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? "Reading…"
                : !canReread
                  ? `Re-read available in ${Math.ceil(cooldownLeft / 1000)}s`
                  : "Re-read the room"}
            </button>
          </section>
        )}

        <footer className="mt-auto space-y-4 pt-16 text-center text-[11px] leading-relaxed text-zinc-600">
          <p>
            On-device previews logged:{" "}
            <span className="text-zinc-400">{listeningCount}</span>
            {" · "}
            <button
              type="button"
              onClick={handleClearListening}
              className="text-indigo-400 underline decoration-indigo-400/40 underline-offset-2 hover:text-indigo-300"
            >
              Clear listening history
            </button>
          </p>
          <p>
            Demo build — contextual inference only, not clinical advice.
            <br />
            Requires{" "}
            <code className="text-zinc-500">ANTHROPIC_API_KEY</code> in{" "}
            <code className="text-zinc-500">.env.local</code>.
          </p>
        </footer>
      </main>
    </div>
  );
}
