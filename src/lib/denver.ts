export const TIMEZONE = "America/Denver" as const;

const denverPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export type DenverParts = {
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: number;
  minute: number;
  dateKey: string;
};

export function getDenverParts(date = new Date()): DenverParts {
  const parts = Object.fromEntries(
    denverPartsFormatter.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  return {
    year,
    month,
    day,
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/** Approximate Denver-local wall time as a Date for comparisons (DST-aware via formatter). */
export function denverWallToUtcGuess(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): Date {
  // Construct an ISO-like string and interpret via a formatter round-trip.
  // Using temporal Offset: America/Denver is UTC-7 (MDT) or UTC-6 (MST).
  // We compute offset by comparing local format of a UTC instant.
  const probe = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  const atNoon = getDenverParts(probe);
  // Difference between intended Denver noon and what UTC noon shows as Denver time
  const denverAsUtcMs = Date.UTC(
    atNoon.year,
    atNoon.month - 1,
    atNoon.day,
    atNoon.hour,
    atNoon.minute,
  );
  const offsetMs = denverAsUtcMs - probe.getTime();
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - offsetMs,
  );
}

export function isStretchDay(parts: DenverParts = getDenverParts()): boolean {
  return parts.weekday === "Mon" || parts.weekday === "Wed";
}

export function stretchDeadlinePassed(
  parts: DenverParts = getDenverParts(),
  deadlineHour = 8,
): boolean {
  if (!isStretchDay(parts)) return false;
  return parts.hour > deadlineHour || (parts.hour === deadlineHour && parts.minute >= 0);
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatDenverDateLong(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDenverTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDenverShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/** Start of today and end of today+lookaheadHours in Denver, as ISO strings. */
export function denverDayWindow(lookaheadHours = 8): {
  rangeStart: string;
  rangeEnd: string;
  asOf: string;
} {
  const now = new Date();
  const parts = getDenverParts(now);
  const start = denverWallToUtcGuess({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 0,
    minute: 0,
  });
  const end = new Date(now.getTime() + lookaheadHours * 60 * 60 * 1000);
  // Also extend at least through end of Denver calendar day
  const endOfDay = denverWallToUtcGuess({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 23,
    minute: 59,
  });
  const rangeEnd = end > endOfDay ? end : endOfDay;
  return {
    rangeStart: start.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    asOf: now.toISOString(),
  };
}
