import type { CalendarEvent } from "../types";
import { getDenverParts, denverWallToUtcGuess } from "../denver";

function atHour(hour: number, minute = 0): string {
  const p = getDenverParts();
  return denverWallToUtcGuess({
    year: p.year,
    month: p.month,
    day: p.day,
    hour,
    minute,
  }).toISOString();
}

export function sampleCalendarEvents(): CalendarEvent[] {
  return [
    {
      id: "sample-cal-1",
      title: "Homeroom",
      start: atHour(8, 0),
      end: atHour(8, 20),
      allDay: false,
      location: "Room 214",
    },
    {
      id: "sample-cal-2",
      title: "Physics — Lab day",
      start: atHour(9, 30),
      end: atHour(10, 50),
      allDay: false,
      location: "Science wing",
    },
    {
      id: "sample-cal-3",
      title: "Stretch / Flex",
      start: atHour(11, 0),
      end: atHour(11, 35),
      allDay: false,
      location: "Gym or assigned room",
    },
    {
      id: "sample-cal-4",
      title: "Soccer practice",
      start: atHour(15, 30),
      end: atHour(17, 0),
      allDay: false,
      location: "North field",
    },
  ];
}

export const SAMPLE_CALENDAR_NOTE =
  "Sample calendar for this public demo.";
