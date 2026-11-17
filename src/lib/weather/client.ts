import { TIMEZONE } from "@/lib/denver";
import type { WeatherResponse } from "@/lib/types";
import {
  MIDWAY,
  OPEN_METEO_FORECAST_URL,
} from "@/lib/weather/config";
import {
  conditionFromWmo,
  formatWeatherLine,
  summaryFromWmo,
} from "@/lib/weather/map";

type OpenMeteoCurrent = {
  temperature_2m: number;
  weather_code: number;
  is_day: number;
  precipitation: number;
};

type OpenMeteoResponse = {
  current?: OpenMeteoCurrent;
};

function fallbackWeather(note: string): WeatherResponse {
  return {
    source: "fallback",
    timezone: TIMEZONE,
    asOf: new Date().toISOString(),
    place: MIDWAY.name,
    latitude: MIDWAY.latitude,
    longitude: MIDWAY.longitude,
    temperatureF: null,
    weatherCode: null,
    isDay: true,
    condition: "clear",
    summary: "Clear",
    line: null,
    note,
  };
}

export async function fetchCurrentWeather(): Promise<WeatherResponse> {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set("latitude", String(MIDWAY.latitude));
  url.searchParams.set("longitude", String(MIDWAY.longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,weather_code,is_day,precipitation",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("timezone", MIDWAY.timezone);

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return fallbackWeather(`Weather upstream returned ${res.status}.`);
    }

    const data = (await res.json()) as OpenMeteoResponse;
    const current = data.current;
    if (
      !current ||
      typeof current.temperature_2m !== "number" ||
      typeof current.weather_code !== "number"
    ) {
      return fallbackWeather("Weather response was incomplete.");
    }

    const isDay = current.is_day === 1;
    const summary = summaryFromWmo(current.weather_code);
    const condition = conditionFromWmo(current.weather_code, isDay);

    return {
      source: "live",
      timezone: TIMEZONE,
      asOf: new Date().toISOString(),
      place: MIDWAY.name,
      latitude: MIDWAY.latitude,
      longitude: MIDWAY.longitude,
      temperatureF: current.temperature_2m,
      weatherCode: current.weather_code,
      isDay,
      condition,
      summary,
      line: formatWeatherLine(current.temperature_2m, summary, MIDWAY.name),
    };
  } catch {
    return fallbackWeather("Could not reach weather service.");
  }
}
