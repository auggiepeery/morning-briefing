import { DEFAULT_CANVAS_BASE_URL, DEFAULT_CANVAS_HINT } from "@/lib/canvas/config";
import { getRtiConfig } from "@/lib/rti/config";
import {
  getDenverParts,
  isStretchDay,
  stretchDeadlinePassed,
} from "@/lib/denver";
import { STRETCH_DEADLINE_HOUR } from "@/lib/stretch";

export async function GET() {
  const rti = getRtiConfig();
  const parts = getDenverParts();

  return Response.json({
    ok: true,
    app: "firstlight-morning-briefing",
    timezone: "America/Denver",
    canvas: {
      effectiveBaseUrl:
        process.env.CANVAS_BASE_URL?.trim() || DEFAULT_CANVAS_BASE_URL,
      baseUrlOverridden: Boolean(process.env.CANVAS_BASE_URL?.trim()),
      tokenSet: Boolean(process.env.CANVAS_ACCESS_TOKEN?.trim()),
      hint: DEFAULT_CANVAS_HINT,
    },
    google: {
      clientIdSet: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
      clientSecretSet: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
      refreshTokenSet: Boolean(process.env.GOOGLE_REFRESH_TOKEN?.trim()),
    },
    weather: {
      place: "Midway",
      latitude: 40.5122,
      longitude: -111.4744,
      provider: "open-meteo",
    },
    stretch: {
      baseUrl: rti.baseUrl,
      credentialMode: rti.mode,
      credentialsConfigured: rti.mode !== "none",
      sessionCookieSet: Boolean(rti.sessionCookie),
      xsrfTokenSet: Boolean(rti.xsrfToken),
      studentIdSet: Boolean(rti.studentId),
      sessionScheduleIdSet: Boolean(rti.sessionScheduleId),
      schoolIdSet: Boolean(rti.schoolId),
      emailKeysSet: Boolean(
        rti.studentSelfEnrollKey && rti.scheduleSelfEnrollmentKey,
      ),
      isStretchMorning: isStretchDay(parts),
      deadlineHour: STRETCH_DEADLINE_HOUR,
      deadlinePassed: stretchDeadlinePassed(parts, STRETCH_DEADLINE_HOUR),
      weekday: parts.weekday,
      dateKey: parts.dateKey,
    },
  });
}
