"use client";

import { useEffect, useRef } from "react";
import type { DeezerTrack } from "@/lib/types";
import {
  getOsNotificationPermission,
  requestOsNotificationPermission,
} from "@/lib/os-notification";

type Props = {
  open: boolean;
  onDismiss: () => void;
  headline: string;
  subline?: string;
  track: DeezerTrack | null;
  onPlayInApp: () => void;
  /** Called after user enables OS notifications successfully */
  onOsEnabled?: () => void;
};

const AUTO_DISMISS_MS = 14_000;

export function VibeDesktopToast({
  open,
  onDismiss,
  headline,
  subline,
  track,
  onPlayInApp,
  onOsEnabled,
}: Props) {
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
      return;
    }
    dismissTimer.current = setTimeout(() => {
      onDismiss();
    }, AUTO_DISMISS_MS);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [open, onDismiss]);

  if (!open) return null;

  const perm = getOsNotificationPermission();
  const showOsHint = perm === "default";

  return (
    <div
      role="dialog"
      aria-label="Vibe ping"
      className="fixed left-4 right-4 top-4 z-[200] hidden md:block md:left-auto md:right-8 md:top-8 md:w-[380px]"
    >
      <div className="overflow-hidden rounded-2xl border-2 border-black bg-[#f4f0ff] shadow-[8px_8px_0_0_#000]">
        <div className="flex items-center gap-1 border-b-2 border-black bg-white px-3 py-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#e85d8e]">
            VibeCheck
          </span>
          <span className="ml-auto flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-black bg-[#ffd6ea]" />
            <span className="h-2.5 w-2.5 rounded-full border border-black bg-[#fff4d6]" />
            <span className="h-2.5 w-2.5 rounded-full border border-black bg-[#d8f8ee]" />
          </span>
        </div>

        <div className="flex gap-3 p-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-[#fff4d6]">
            {track?.album?.cover_medium ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.album.cover_medium}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-neutral-600">
                VC
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-snug text-neutral-900">
              {headline}
            </p>
            {subline ? (
              <p className="mt-1 line-clamp-2 text-xs text-neutral-700">{subline}</p>
            ) : null}
            {track ? (
              <p className="mt-2 truncate text-xs font-semibold text-neutral-800">
                <span className="text-neutral-600">{track.artist.name}</span>
                {" · "}
                <span>{track.title}</span>
              </p>
            ) : (
              <p className="mt-2 text-xs font-medium text-neutral-600">
                No preview this round — try Re-read.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t-2 border-black bg-[#faf5eb] px-4 py-3">
          <button
            type="button"
            onClick={() => {
              onPlayInApp();
              onDismiss();
            }}
            disabled={!track}
            className="rounded-xl border-2 border-black bg-[#ffb8d9] px-4 py-2 text-xs font-bold text-neutral-900 shadow-[3px_3px_0_0_#000] hover:bg-[#ffa3cf] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Play in app
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border-2 border-black bg-white px-4 py-2 text-xs font-bold text-neutral-900 shadow-[3px_3px_0_0_#000] hover:bg-[#fff4d6]"
          >
            Dismiss
          </button>
          {showOsHint ? (
            <button
              type="button"
              onClick={async () => {
                const p = await requestOsNotificationPermission();
                if (p === "granted") onOsEnabled?.();
              }}
              className="ml-auto rounded-xl border-2 border-dashed border-neutral-600 bg-[#e8fcff] px-3 py-2 text-[11px] font-semibold text-neutral-800"
            >
              Desktop alerts…
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
