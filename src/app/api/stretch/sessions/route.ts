import {
  enrollStretchOption,
  findPeStretch,
  getStretchSessions,
} from "@/lib/rti/client";
import { getRtiConfig } from "@/lib/rti/config";
import { STRETCH_DEADLINE_HOUR } from "@/lib/stretch";
import {
  getDenverParts,
  isStretchDay,
  stretchDeadlinePassed,
} from "@/lib/denver";
import type { StretchSessionsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceShow = url.searchParams.has("stretch");
  const parts = getDenverParts();
  const isStretchMorning = forceShow || isStretchDay(parts);
  const deadlinePassed = stretchDeadlinePassed(parts, STRETCH_DEADLINE_HOUR);

  const base = await getStretchSessions();

  let response: StretchSessionsResponse = {
    ...base,
    isStretchMorning,
    deadlinePassed,
    deadlineHour: STRETCH_DEADLINE_HOUR,
    dateKey: parts.dateKey,
  };

  if (!isStretchMorning) {
    return Response.json(response);
  }

  const alreadyPicked = Boolean(response.selfEnrolled || response.selected);
  if (deadlinePassed && !alreadyPicked) {
    const pe = findPeStretch(response.sessions);
    if (pe) {
      const enrolled = await enrollStretchOption(pe.sessionId, {
        sessionName: pe.name,
        autoSelected: true,
      });

      if (enrolled.ok) {
        response = {
          ...response,
          selected: pe,
          selfEnrolled: !enrolled.mocked,
          autoEnrolled: true,
          note: enrolled.note ?? response.note,
        };
      } else {
        response = {
          ...response,
          selected: pe,
          autoEnrolled: true,
          note:
            enrolled.note ??
            "Deadline passed — PE Stretch selected locally, but RTI enrollment failed.",
          error: enrolled.error,
        };
      }
    } else {
      response = {
        ...response,
        note:
          (response.note ? `${response.note} ` : "") +
          "Deadline passed and PE Stretch was not in the open list.",
      };
    }
  }

  const config = getRtiConfig();
  if (!response.loginUrl) {
    response.loginUrl = `${config.baseUrl}/choose-login`;
  }

  return Response.json(response);
}
