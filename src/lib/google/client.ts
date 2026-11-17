import type { CalendarEventsResponse } from "../types";
import { TIMEZONE, denverDayWindow } from "../denver";
import { SAMPLE_CALENDAR_NOTE, sampleCalendarEvents } from "./sample";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleEventItem = {
  id: string;
  summary?: string;
  htmlLink?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type GoogleEventsList = {
  items?: GoogleEventItem[];
};

function oauthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_REFRESH_TOKEN?.trim(),
  );
}

async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!.trim();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const json = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `token ${res.status}`);
  }
  return json.access_token;
}

/**
 * Google Calendar client (server-only). Secrets stay in process.env —
 * never VITE_/NEXT_PUBLIC_.
 */
export async function fetchTodaysEvents(): Promise<CalendarEventsResponse> {
  const { rangeStart, rangeEnd, asOf } = denverDayWindow(8);
  const configured = oauthConfigured();

  if (!configured) {
    return {
      source: "sample",
      timezone: TIMEZONE,
      asOf,
      rangeStart,
      rangeEnd,
      events: sampleCalendarEvents(),
      note: SAMPLE_CALENDAR_NOTE,
      oauthConfigured: false,
      connected: false,
    };
  }

  try {
    const accessToken = await refreshAccessToken();
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", rangeStart);
    url.searchParams.set("timeMax", rangeEnd);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "25");
    url.searchParams.set("timeZone", TIMEZONE);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`calendar ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as GoogleEventsList;
    const events = (data.items ?? []).map((item) => {
      const start = item.start?.dateTime || item.start?.date || rangeStart;
      const end = item.end?.dateTime || item.end?.date || start;
      const allDay = Boolean(item.start?.date && !item.start?.dateTime);
      return {
        id: item.id,
        title: item.summary || "(No title)",
        start,
        end,
        allDay,
        location: item.location,
        htmlLink: item.htmlLink,
      };
    });

    return {
      source: "live",
      timezone: TIMEZONE,
      asOf,
      rangeStart,
      rangeEnd,
      events,
      note: "Live from Google Calendar (primary)",
      oauthConfigured: true,
      connected: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Google error";
    return {
      source: "sample",
      timezone: TIMEZONE,
      asOf,
      rangeStart,
      rangeEnd,
      events: sampleCalendarEvents(),
      note: `Google Calendar live fetch failed (${message}). Showing sample data.`,
      oauthConfigured: true,
      connected: false,
    };
  }
}

export { oauthConfigured };
