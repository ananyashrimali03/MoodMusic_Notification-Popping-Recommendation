import { buildListeningContext, loadListeningHistory } from "./listening";
import type { SignalsPacket } from "./types";
import { fetchOpenMeteoWeather } from "./weather";

function getMobileHeuristic(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Mobile|Android|iPhone|iPad/i.test(ua);
}

export function getPositionQuick(timeoutMs: number): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(pos);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, maximumAge: 600_000, timeout: timeoutMs }
    );
  });
}

export async function maybeGetBattery(): Promise<{
  percent: number | null;
  charging: boolean | null;
}> {
  try {
    const bat = (
      navigator as Navigator & {
        getBattery?: () => Promise<{ level: number; charging: boolean }>;
      }
    ).getBattery?.();
    if (!bat) return { percent: null, charging: null };
    const b = await bat;
    return { percent: Math.round(b.level * 100), charging: b.charging };
  } catch {
    return { percent: null, charging: null };
  }
}

export async function collectSignalsPacket(opts: {
  lastInteractionAt: number;
}): Promise<SignalsPacket> {
  const limitations: string[] = [];
  const now = new Date();

  let geo: SignalsPacket["geo"];
  const pos = await getPositionQuick(5000);
  if (!pos) limitations.push("geolocation_denied_or_timeout");
  else {
    geo = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy_m: pos.coords.accuracy ?? undefined,
    };
  }

  let weather: SignalsPacket["weather"];
  if (geo) {
    const w = await fetchOpenMeteoWeather(geo.lat, geo.lon);
    if (w) weather = w;
    else limitations.push("weather_unavailable");
  } else {
    limitations.push("weather_skipped_no_geo");
  }

  const bat = await maybeGetBattery();
  if (bat.percent === null) limitations.push("battery_api_unavailable");

  const idle_ms_estimate = Math.max(0, Date.now() - opts.lastInteractionAt);

  const listeningRows = loadListeningHistory();
  if (listeningRows.length === 0) limitations.push("listening_cold_start");

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localParts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: tz,
  }).formatToParts(now);
  const hh = localParts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = localParts.find((p) => p.type === "minute")?.value ?? "00";

  const day = now.toLocaleDateString("en-US", { weekday: "long", timeZone: tz });

  const packet: SignalsPacket = {
    collected_at_iso: now.toISOString(),
    timezone: tz,
    local_time_24h: `${hh}:${mm}`,
    day_of_week: day,
    locale: typeof navigator !== "undefined" ? navigator.language : "en-US",
    geo,
    weather,
    device: {
      battery_percent: bat.percent,
      charging: bat.charging,
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      ua_mobile: getMobileHeuristic(),
    },
    behavior: {
      visibility:
        typeof document !== "undefined" ? document.visibilityState : "visible",
      idle_ms_estimate,
    },
    listening: buildListeningContext(listeningRows),
    limitations,
  };

  return packet;
}
