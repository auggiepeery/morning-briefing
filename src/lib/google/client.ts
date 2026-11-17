import type { CalendarEventsResponse } from "../types";
import { TIMEZONE, denverDayWindow } from "../denver";
import { sampleCalendarEvents } from "./sample";

/** Public-safe: never reads Google secrets or calls Calendar APIs. */
export function oauthConfigured(): boolean {
  return false;
}

/** Public-safe stub — sample events only. */
export async function fetchTodaysEvents(): Promise<CalendarEventsResponse> {
  const { rangeStart, rangeEnd, asOf } = denverDayWindow(8);
  return {
    source: "sample",
    timezone: TIMEZONE,
    asOf,
    rangeStart,
    rangeEnd,
    events: sampleCalendarEvents(),
    note: "Sample calendar — live Google Calendar is not shipped in this public build.",
    oauthConfigured: false,
    connected: false,
  };
}
