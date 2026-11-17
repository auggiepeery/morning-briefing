import { getStretchSessions } from "@/lib/rti/client";
import { getRtiConfig, rtiLoginUrl } from "@/lib/rti/config";
import { ownerLiveIntegrationsAllowed } from "@/lib/owner-auth";
import { STRETCH_DEADLINE_HOUR } from "@/lib/stretch";
import {
  getDenverParts,
  isStretchDay,
  stretchDeadlinePassed,
} from "@/lib/denver";
import type { StretchSessionsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Lists stretch options only. Never auto-enrolls — mutating on GET let any
 * page or link enroll the owner's school account on a public app.
 */
export async function GET(request: Request) {
  const parts = getDenverParts();
  const isStretchMorning = isStretchDay(parts);
  const deadlinePassed = stretchDeadlinePassed(parts, STRETCH_DEADLINE_HOUR);
  const allowLive = await ownerLiveIntegrationsAllowed(request);

  const base = await getStretchSessions({ allowLive });

  const response: StretchSessionsResponse = {
    ...base,
    isStretchMorning,
    deadlinePassed,
    deadlineHour: STRETCH_DEADLINE_HOUR,
    dateKey: parts.dateKey,
    autoEnrolled: false,
    loginUrl: base.loginUrl || rtiLoginUrl(getRtiConfig()),
  };

  return Response.json(response);
}
