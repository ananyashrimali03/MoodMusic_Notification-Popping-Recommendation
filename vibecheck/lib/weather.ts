/** Map Open-Meteo WMO-ish codes to coarse buckets for the LLM */

export function weatherCodeToCondition(code: number): string {
  if ([0].includes(code)) return "clear";
  if ([1, 2, 3].includes(code)) return "cloud";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "unknown";
}

export async function fetchOpenMeteoWeather(
  lat: number,
  lon: number
): Promise<{ condition: string; temp_c: number; wind_mps: number; weather_code: number } | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const cur = data?.current;
    if (!cur) return null;
    const code = Number(cur.weather_code ?? 0);
    return {
      condition: weatherCodeToCondition(code),
      temp_c: Number(cur.temperature_2m),
      wind_mps: Number(cur.wind_speed_10m),
      weather_code: code,
    };
  } catch {
    return null;
  }
}
