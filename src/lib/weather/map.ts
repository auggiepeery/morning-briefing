import type { WeatherCondition } from "@/lib/types";

/** Map WMO weather interpretation codes to expressive hero conditions. */
export function conditionFromWmo(
  code: number,
  isDay: boolean,
): WeatherCondition {
  if (code === 0) return isDay ? "clear" : "clear-night";
  if (code === 1 || code === 2) return isDay ? "partly-cloudy" : "cloudy-night";
  if (code === 3) return isDay ? "overcast" : "cloudy-night";
  if (code === 45 || code === 48) return "fog";
  if (
    code === 51 ||
    code === 53 ||
    code === 55 ||
    code === 56 ||
    code === 57 ||
    code === 61 ||
    code === 63 ||
    code === 65 ||
    code === 66 ||
    code === 67 ||
    code === 80 ||
    code === 81 ||
    code === 82
  ) {
    return "rain";
  }
  if (
    code === 71 ||
    code === 73 ||
    code === 75 ||
    code === 77 ||
    code === 85 ||
    code === 86
  ) {
    return "snow";
  }
  if (code === 95 || code === 96 || code === 99) return "storm";
  return isDay ? "partly-cloudy" : "cloudy-night";
}

export function summaryFromWmo(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code === 51 || code === 53 || code === 55) return "Drizzle";
  if (code === 56 || code === 57) return "Freezing drizzle";
  if (code === 61 || code === 63 || code === 65) return "Rain";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code === 71 || code === 73 || code === 75 || code === 77) return "Snow";
  if (code === 80 || code === 81 || code === 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm";
  return "Mixed skies";
}

export function formatWeatherLine(
  temperatureF: number,
  summary: string,
  place: string,
): string {
  const deg = Math.round(temperatureF);
  return `${deg}° · ${summary} in ${place}`;
}
