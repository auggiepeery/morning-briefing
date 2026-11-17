import type { CanvasAssignment } from "../types";
import { getDenverParts, denverWallToUtcGuess } from "../denver";

function offsetDay(base: ReturnType<typeof getDenverParts>, dayDelta: number, hour: number) {
  const probe = denverWallToUtcGuess({
    year: base.year,
    month: base.month,
    day: base.day,
    hour: 12,
    minute: 0,
  });
  const shifted = new Date(probe.getTime() + dayDelta * 24 * 60 * 60 * 1000);
  const p = getDenverParts(shifted);
  return denverWallToUtcGuess({
    year: p.year,
    month: p.month,
    day: p.day,
    hour,
    minute: 0,
  }).toISOString();
}

export function sampleCanvasAssignments(): CanvasAssignment[] {
  const now = getDenverParts();
  return [
    {
      id: "sample-1",
      name: "Lab report — wave interference",
      courseName: "Physics",
      dueAt: offsetDay(now, -1, 23),
      htmlUrl: "https://canvas.instructure.com",
      pointsPossible: 50,
      status: "overdue",
    },
    {
      id: "sample-2",
      name: "Reading quiz: Ch. 7",
      courseName: "English Lit",
      dueAt: offsetDay(now, 0, 23),
      htmlUrl: "https://canvas.instructure.com",
      pointsPossible: 10,
      status: "due_soon",
    },
    {
      id: "sample-3",
      name: "Problem set 4",
      courseName: "Precalculus",
      dueAt: offsetDay(now, 2, 8),
      htmlUrl: "https://canvas.instructure.com",
      pointsPossible: 25,
      status: "upcoming",
    },
    {
      id: "sample-4",
      name: "Discussion: local ecosystems",
      courseName: "Biology",
      dueAt: offsetDay(now, 4, 17),
      htmlUrl: "https://canvas.instructure.com",
      pointsPossible: 15,
      status: "upcoming",
    },
  ];
}

export const SAMPLE_CANVAS_NOTE =
  "Sample Canvas data — live LMS sync is not shipped in this public build.";
