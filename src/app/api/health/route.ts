import {
  getDenverParts,
  isStretchDay,
  stretchDeadlinePassed,
} from "@/lib/denver";
import { STRETCH_DEADLINE_HOUR } from "@/lib/stretch";

/** Minimal health — no secret/config probes (those leaked setup on public apps). */
export async function GET() {
  const parts = getDenverParts();

  return Response.json({
    ok: true,
    app: "firstlight-morning-briefing",
    timezone: "America/Denver",
    weather: {
      place: "Midway",
      provider: "open-meteo",
    },
    stretch: {
      isStretchMorning: isStretchDay(parts),
      deadlineHour: STRETCH_DEADLINE_HOUR,
      deadlinePassed: stretchDeadlinePassed(parts, STRETCH_DEADLINE_HOUR),
      weekday: parts.weekday,
      dateKey: parts.dateKey,
    },
  });
}
