"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearListeningHistory,
  loadListeningHistory,
  recordPreviewListen,
} from "@/lib/listening";
import { nextDemoScene } from "@/lib/demo-scenes";
import { VibeDesktopToast } from "@/components/VibeDesktopToast";
import { VibePlayerWidget } from "@/components/VibePlayerWidget";
import { postVibeOsNotification } from "@/lib/os-notification";
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
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [toastOpen, setToastOpen] = useState(false);
  const [playSignal, setPlaySignal] = useState(0);

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
    setLoading(true);
    setErr(null);
    try {
      await new Promise((r) => setTimeout(r, 550));

      const cycleId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());

      const { inference: result, tracks: list } = nextDemoScene();

      console.table({
        cycle_id: cycleId,
        mode: "demo_hardcoded",
        previews: list.length,
      });

      setInference(result);
      setTracks(list);
      setActiveTrackIndex(0);
      setLastRun(Date.now());
      setToastOpen(true);

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        postVibeOsNotification({
          body: result.notification_line,
          icon: list[0]?.album?.cover_medium,
          tag: `vibe-${cycleId}`,
        });
      }
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
    !loading &&
    cooldownLeft === 0 &&
    privacyOk &&
    hydrated &&
    !!inference;

  const navigateTrack = useCallback((delta: -1 | 1) => {
    setActiveTrackIndex((i) => {
      const len = tracks.length;
      if (len === 0) return 0;
      return (i + delta + len) % len;
    });
  }, [tracks.length]);

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

  const handleToastPlayInApp = useCallback(() => {
    setPlaySignal((n) => n + 1);
    requestAnimationFrame(() => {
      document
        .getElementById("vibe-player-widget")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const reshuffleTracks = useCallback(() => {
    touchActivity();
    setTracks((prev) => {
      if (prev.length < 2) return prev;
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
    setActiveTrackIndex(0);
  }, [touchActivity]);

  const canReshuffle =
    !loading && privacyOk && hydrated && !!inference && tracks.length >= 2;

  return (
    <div className="relative min-h-full bg-[#fff8f0] text-neutral-900">
      {hydrated && inference && (
        <VibeDesktopToast
          open={toastOpen}
          onDismiss={() => setToastOpen(false)}
          headline={inference.notification_line}
          subline={
            [inference.mood_label, inference.weather_metaphor]
              .filter(Boolean)
              .join(" · ") || undefined
          }
          track={tracks[activeTrackIndex] ?? tracks[0] ?? null}
          onPlayInApp={handleToastPlayInApp}
          onOsEnabled={() => {
            postVibeOsNotification({
              body: "Desktop alerts are on — you’ll see a system ping when we finish reading the room.",
              tag: "vibecheck-alerts-enabled",
            });
          }}
        />
      )}

      <main className="relative z-10 mx-auto flex min-h-full max-w-lg flex-col px-5 pb-16 pt-12">
        {!online && (
          <div className="mb-6 rounded-2xl border-2 border-black bg-[#ffe8e0] px-4 py-3 text-sm text-neutral-900 shadow-[4px_4px_0_0_#000]">
            You’re offline — scripted text still works; audio streams need internet.
          </div>
        )}
        {!(inference && tracks.length > 0) && (
          <header className="mb-10 rounded-3xl border-2 border-black bg-[#fff4d6] px-5 py-5 shadow-[6px_6px_0_0_#000]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e85d8e]">
              VibeCheck
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
              Reading the room.
            </h1>
            {!inference && (
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                Pure browser demo — curated scenes & sample audio. No API keys, no
                live LLM calls.
              </p>
            )}
          </header>
        )}

        {!hydrated && (
          <p className="py-24 text-center text-sm text-neutral-600">Loading…</p>
        )}

        {hydrated && !privacyOk && (
          <div className="rounded-3xl border-2 border-black bg-[#d8f8ee] p-5 shadow-[6px_6px_0_0_#000]">
            <p className="text-sm leading-relaxed text-neutral-800">
              This build is <strong className="font-semibold text-neutral-900">offline-first for logic</strong>
              : recommendations are hardcoded playlists for the hackathon demo.
              Preview plays you tap can still be logged{" "}
              <strong className="font-semibold text-neutral-900">only on this device</strong>{" "}
              — clear anytime in the footer. No accounts, no cloud inference.
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
              Loading demo scene…
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
            {tracks.length > 0 && (
              <VibePlayerWidget
                tracks={tracks}
                activeIndex={activeTrackIndex}
                onNavigateTrack={navigateTrack}
                onPreviewListen={onPreviewPlay}
                playSignal={playSignal}
              />
            )}

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
                  How this demo scene is framed
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
                Demo keywords:{" "}
                <span className="font-medium text-neutral-900">
                  {inference.deezer_search_query}
                </span>
              </p>
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-700">
                  Demo playlist
                </p>
                <button
                  type="button"
                  disabled={!canReshuffle}
                  onClick={reshuffleTracks}
                  title={
                    tracks.length < 2
                      ? "Need at least two tracks to reshuffle"
                      : "Randomize track order for this vibe"
                  }
                  className="rounded-xl border-2 border-black bg-[#e8deff] px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow-[3px_3px_0_0_#000] transition enabled:hover:bg-[#ddd4ff] enabled:active:translate-x-[1px] enabled:active:translate-y-[1px] enabled:active:shadow-[1px_1px_0_0_#000] disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-500 disabled:shadow-none"
                >
                  Reshuffle
                </button>
              </div>
              {tracks.length === 0 ? (
                <p className="rounded-2xl border-2 border-black border-dashed bg-[#faf5eb] px-4 py-6 text-center text-sm text-neutral-600">
                  No tracks in this scene—try Re-read the room.
                </p>
              ) : (
                <ul className="space-y-4" data-track-list>
                  {tracks.map((t, i) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTrackIndex(i)}
                        className={`flex w-full gap-3 rounded-2xl border-2 p-3 text-left shadow-[4px_4px_0_0_#000] transition hover:bg-[#c8f5e5] ${
                          i === activeTrackIndex
                            ? "border-black bg-[#c8f5e5] ring-2 ring-black ring-offset-2"
                            : "border-black bg-[#dffaf0]"
                        }`}
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
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                            {i === activeTrackIndex
                              ? "Playing in widget above"
                              : "Tap to load in widget"}
                          </p>
                          <a
                            href={t.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs font-semibold text-neutral-900 underline decoration-2 underline-offset-2 hover:text-[#e85d8e]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Sample credits
                          </a>
                        </div>
                      </button>
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

        <footer
          id="vibecheck-footer"
          className="mt-auto space-y-4 rounded-3xl border-2 border-black border-dashed bg-[#faf5eb] px-4 py-5 pt-8 text-center text-[11px] leading-relaxed text-neutral-700"
        >
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
            Demo build — scripted “vibe” copy + SoundHelix sample MP3s. Not clinical
            advice. No API keys required.
          </p>
        </footer>
      </main>
    </div>
  );
}
