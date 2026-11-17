import { getStretchSessions } from "@/lib/rti/client";
import { rtiLoginUrl } from "@/lib/rti/config";
import { STRETCH_DEADLINE_HOUR } from "@/lib/stretch";
import {
  getDenverParts,
  isStretchDay,
  stretchDeadlinePassed,
} from "@/lib/denver";
import type { StretchSessionsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Lists sample stretch options only. Never auto-enrolls. */
export async function GET() {
  const parts = getDenverParts();
  const base = await getStretchSessions();

  const response: StretchSessionsResponse = {
    ...base,
    isStretchMorning: isStretchDay(parts),
    deadlinePassed: stretchDeadlinePassed(parts, STRETCH_DEADLINE_HOUR),
    deadlineHour: STRETCH_DEADLINE_HOUR,
    dateKey: parts.dateKey,
    autoEnrolled: false,
    loginUrl: base.loginUrl || rtiLoginUrl(),
  };

  return Response.json(response);
}
