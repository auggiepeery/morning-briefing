import { denverWallToUtcGuess, getDenverParts } from "../denver";
import { PE_STRETCH_NAME } from "../stretch";
import type {
  StretchEnrollResponse,
  StretchSessionOption,
  StretchSessionsResponse,
} from "../types";
import { getRtiConfig, rtiLoginUrl, type RtiConfig } from "./config";
import { SAMPLE_STRETCH_NOTE, sampleStretchSessions } from "./sample";

type RtiOpenSession = {
  sessionId?: number | string;
  sessionName?: string;
  courseName?: string | null;
  session?: {
    sessionId?: number | string;
    name?: string;
    capacity?: number | null;
    currentlyEnrolled?: number | null;
    course?: { name?: string | null } | null;
  };
  instructor?: {
    firstName?: string | null;
    lastName?: string | null;
    department?: string | null;
  } | null;
};

type RtiSelfEnrollmentInfo = {
  openSessions?: RtiOpenSession[];
  selectedSession?: RtiOpenSession | null;
  selfEnrolled?: boolean;
  student?: { id?: number | string; firstName?: string; lastName?: string };
  schedule?: { sessionScheduleId?: number | string; name?: string };
};

type RtiUserEntity = {
  role?: string | null;
  school?: { id?: number | string; name?: string | null } | null;
  entity?: { id?: number | string; firstName?: string; lastName?: string } | null;
};

type RtiAgendaSchedule = {
  sessionScheduleId?: number | string;
  name?: string | null;
  scheduleStart?: number | string | null;
  scheduleEnd?: number | string | null;
  studentEnrollment?: boolean | null;
  studentEnrollmentStart?: number | string | null;
  studentEnrollmentEnd?: number | string | null;
  status?: string | null;
  mySessions?: unknown[] | null;
};

type ResolvedSessionContext = {
  studentId: string;
  sessionScheduleId: string;
  schoolId: string | null;
};

function isPeStretchName(name: string): boolean {
  return name.trim().toLowerCase() === PE_STRETCH_NAME.toLowerCase();
}

function instructorLabel(session: RtiOpenSession): string | null {
  const first = session.instructor?.firstName?.trim() ?? "";
  const last = session.instructor?.lastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || null;
}

function seatsLabel(session: RtiOpenSession): string | null {
  const enrolled = session.session?.currentlyEnrolled;
  const capacity = session.session?.capacity;
  if (enrolled == null || capacity == null) return null;
  return `${enrolled} / ${capacity}`;
}

export function normalizeOpenSession(raw: RtiOpenSession): StretchSessionOption | null {
  const sessionId = String(raw.session?.sessionId ?? raw.sessionId ?? "").trim();
  const name = String(raw.session?.name ?? raw.sessionName ?? "").trim();
  if (!sessionId || !name) return null;

  return {
    sessionId,
    name,
    instructor: instructorLabel(raw),
    department: raw.instructor?.department?.trim() || null,
    courseName: raw.session?.course?.name ?? raw.courseName ?? null,
    seatsLabel: seatsLabel(raw),
    isPeStretch: isPeStretchName(name),
  };
}

function authHeaders(config: RtiConfig): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    BuildID: "firstlight",
  };

  if (config.mode === "session_cookie" && config.sessionCookie) {
    const cookieParts = [`SESSION=${config.sessionCookie}`];
    if (config.xsrfToken) {
      cookieParts.push(`XSRF-TOKEN-PROD=${config.xsrfToken}`);
      headers["X-XSRF-TOKEN"] = config.xsrfToken;
    }
    headers.Cookie = cookieParts.join("; ");
  }

  return headers;
}

function sessionsPath(config: RtiConfig, ctx: ResolvedSessionContext): string {
  if (config.mode === "email_keys") {
    return `${config.baseUrl}/self-enrollment-api/operations/self-enrollment/student/${encodeURIComponent(config.studentSelfEnrollKey!)}/schedule/${encodeURIComponent(config.scheduleSelfEnrollmentKey!)}`;
  }
  return `${config.baseUrl}/self-enrollment-api/operations/self-enrollment/student/${encodeURIComponent(ctx.studentId)}/schedule/${encodeURIComponent(ctx.sessionScheduleId)}/logged-in-self-enrollment`;
}

function enrollPath(
  config: RtiConfig,
  ctx: ResolvedSessionContext,
  sessionId: string,
): string {
  if (config.mode === "email_keys") {
    return `${config.baseUrl}/self-enrollment-api/operations/self-enrollment/student/${encodeURIComponent(config.studentSelfEnrollKey!)}/session/${encodeURIComponent(sessionId)}`;
  }
  return `${config.baseUrl}/self-enrollment-api/operations/self-enrollment/student/${encodeURIComponent(ctx.studentId)}/session/${encodeURIComponent(sessionId)}/logged-in-self-enrollment`;
}

async function rtiFetchJson<T>(
  url: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    const text = await res.text().catch(() => "");
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = null;
      }
    }

    if (!res.ok) {
      const fromBody =
        parsed &&
        typeof parsed === "object" &&
        "message" in parsed &&
        typeof (parsed as { message: unknown }).message === "string"
          ? (parsed as { message: string }).message
          : null;
      let message = fromBody || `RTI ${res.status}: ${text.slice(0, 180)}`;
      if (res.status === 401 || res.status === 403) {
        message =
          fromBody ||
          "RTI session expired or blocked (401/403). Refresh SESSION + XSRF-TOKEN-PROD from a Mac SSO login, then update secrets.";
      }
      return {
        ok: false,
        status: res.status,
        message,
      };
    }

    return { ok: true, data: (parsed ?? {}) as T };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: err instanceof Error ? err.message : "RTI request failed",
    };
  }
}

function denverDayBoundsMs(now = new Date()): { start: number; end: number } {
  const parts = getDenverParts(now);
  const start = denverWallToUtcGuess({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 0,
    minute: 0,
  }).getTime();
  const end = denverWallToUtcGuess({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 23,
    minute: 59,
  }).getTime();
  return { start, end };
}

async function discoverStudentAndSchool(
  config: RtiConfig,
): Promise<
  | { ok: true; studentId: string; schoolId: string | null }
  | { ok: false; message: string; status: number }
> {
  if (config.studentId) {
    return {
      ok: true,
      studentId: config.studentId,
      schoolId: config.schoolId,
    };
  }

  const result = await rtiFetchJson<RtiUserEntity[]>(
    `${config.baseUrl}/user/entities`,
    { method: "GET", headers: authHeaders(config) },
  );
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      message:
        result.message ||
        "Could not load /user/entities — set RTI_STUDENT_ID manually or refresh SESSION.",
    };
  }

  const entities = Array.isArray(result.data) ? result.data : [];
  const students = entities.filter(
    (e) => String(e.role ?? "").toLowerCase() === "student" && e.entity?.id != null,
  );
  const pick = students[0] ?? entities.find((e) => e.entity?.id != null);
  if (!pick?.entity?.id) {
    return {
      ok: false,
      status: 0,
      message:
        "No student entity on this SESSION. Log into school-timeline with the student Google account, then refresh the cookie.",
    };
  }

  return {
    ok: true,
    studentId: String(pick.entity.id),
    schoolId: config.schoolId ?? (pick.school?.id != null ? String(pick.school.id) : null),
  };
}

function scoreEnrollableSchedule(schedule: RtiAgendaSchedule, nowMs: number): number {
  if (schedule.studentEnrollment === false) return -1000;
  if (String(schedule.status ?? "").toLowerCase() === "hidden") return -500;
  let score = 0;
  if (schedule.studentEnrollment) score += 50;
  const start = schedule.studentEnrollmentStart
    ? Number(schedule.studentEnrollmentStart)
    : null;
  const end = schedule.studentEnrollmentEnd
    ? Number(schedule.studentEnrollmentEnd)
    : null;
  if (start != null && !Number.isNaN(start) && nowMs >= start) score += 10;
  if (end != null && !Number.isNaN(end) && nowMs <= end) score += 20;
  if (end != null && !Number.isNaN(end) && nowMs > end) score -= 40;
  const mine = Array.isArray(schedule.mySessions) ? schedule.mySessions.length : 0;
  if (mine === 0) score += 15;
  return score;
}

async function discoverSessionScheduleId(
  config: RtiConfig,
  studentId: string,
  schoolId: string | null,
): Promise<
  | { ok: true; sessionScheduleId: string }
  | { ok: false; message: string; status: number }
> {
  if (config.sessionScheduleId) {
    return { ok: true, sessionScheduleId: config.sessionScheduleId };
  }

  if (!schoolId) {
    return {
      ok: false,
      status: 0,
      message:
        "RTI_SESSION_SCHEDULE_ID is unset and school id is unknown. Set RTI_SCHOOL_ID or RTI_SESSION_SCHEDULE_ID.",
    };
  }

  const { start, end } = denverDayBoundsMs();
  const url =
    `${config.baseUrl}/api/operations/schedule/school/${encodeURIComponent(schoolId)}/schedules-by-date-range` +
    `?start=${start}&end=${end}&withSessionsForStudent=${encodeURIComponent(studentId)}&spanningAnyAmountOfRange=true`;

  const result = await rtiFetchJson<{ schedules?: RtiAgendaSchedule[] }>(url, {
    method: "GET",
    headers: authHeaders(config),
  });
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      message:
        result.message ||
        "Could not discover today’s schedule. Set RTI_SESSION_SCHEDULE_ID from school-timeline.",
    };
  }

  const schedules = result.data.schedules ?? [];
  if (!schedules.length) {
    return {
      ok: false,
      status: 0,
      message:
        "No RTI schedules found for today for this student. Set RTI_SESSION_SCHEDULE_ID from school-timeline, or try on a stretch day.",
    };
  }

  const nowMs = Date.now();
  const ranked = [...schedules]
    .map((s) => ({ s, score: scoreEnrollableSchedule(s, nowMs) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.s;
  const id = best?.sessionScheduleId != null ? String(best.sessionScheduleId) : "";
  if (!id) {
    return {
      ok: false,
      status: 0,
      message: "Today’s RTI schedules had no sessionScheduleId.",
    };
  }

  return { ok: true, sessionScheduleId: id };
}

async function resolveSessionContext(
  config: RtiConfig,
): Promise<
  | { ok: true; ctx: ResolvedSessionContext }
  | { ok: false; message: string; status: number }
> {
  if (config.mode === "email_keys") {
    return {
      ok: true,
      ctx: {
        studentId: config.studentSelfEnrollKey!,
        sessionScheduleId: config.scheduleSelfEnrollmentKey!,
        schoolId: config.schoolId,
      },
    };
  }

  if (config.mode !== "session_cookie") {
    return { ok: false, status: 0, message: "RTI credentials not configured" };
  }

  const who = await discoverStudentAndSchool(config);
  if (!who.ok) return who;

  const schedule = await discoverSessionScheduleId(
    config,
    who.studentId,
    who.schoolId,
  );
  if (!schedule.ok) return schedule;

  return {
    ok: true,
    ctx: {
      studentId: who.studentId,
      sessionScheduleId: schedule.sessionScheduleId,
      schoolId: who.schoolId,
    },
  };
}

export async function fetchLiveStretchInfo(
  config: RtiConfig = getRtiConfig(),
): Promise<
  | {
      ok: true;
      info: RtiSelfEnrollmentInfo;
      sessions: StretchSessionOption[];
      ctx: ResolvedSessionContext;
    }
  | { ok: false; message: string; status: number }
> {
  if (config.mode === "none") {
    return { ok: false, status: 0, message: "RTI credentials not configured" };
  }

  const resolved = await resolveSessionContext(config);
  if (!resolved.ok) return resolved;

  const result = await rtiFetchJson<RtiSelfEnrollmentInfo>(
    sessionsPath(config, resolved.ctx),
    {
      method: "GET",
      headers: authHeaders(config),
    },
  );

  if (!result.ok) return result;

  const sessions = (result.data.openSessions ?? [])
    .map(normalizeOpenSession)
    .filter((s): s is StretchSessionOption => Boolean(s));

  return { ok: true, info: result.data, sessions, ctx: resolved.ctx };
}

export async function enrollInStretchSession(
  sessionId: string,
  config: RtiConfig = getRtiConfig(),
  ctx?: ResolvedSessionContext,
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  if (config.mode === "none") {
    return { ok: false, status: 0, message: "RTI credentials not configured" };
  }

  let resolved = ctx;
  if (!resolved) {
    const r = await resolveSessionContext(config);
    if (!r.ok) return r;
    resolved = r.ctx;
  }

  if (config.mode === "session_cookie" && !config.xsrfToken) {
    return {
      ok: false,
      status: 0,
      message:
        "RTI_XSRF_TOKEN is required for school-timeline enroll POSTs. Copy XSRF-TOKEN-PROD from Mac DevTools after SSO.",
    };
  }

  const result = await rtiFetchJson<unknown>(
    enrollPath(config, resolved, sessionId),
    {
      method: "POST",
      headers: {
        ...authHeaders(config),
        "Content-Type": "application/json",
      },
      body: null,
    },
  );

  if (!result.ok) return result;
  return { ok: true };
}

export function findPeStretch(
  sessions: StretchSessionOption[],
): StretchSessionOption | null {
  return sessions.find((s) => s.isPeStretch) ?? null;
}

export async function getStretchSessions(): Promise<StretchSessionsResponse> {
  const asOf = new Date().toISOString();
  const config = getRtiConfig();
  const loginUrl = rtiLoginUrl(config);

  if (config.mode === "none") {
    const sessions = sampleStretchSessions();
    return {
      source: "sample",
      timezone: "America/Denver",
      asOf,
      credentialMode: "none",
      sessions,
      selected: null,
      note: SAMPLE_STRETCH_NOTE,
      loginUrl,
    };
  }

  const live = await fetchLiveStretchInfo(config);
  if (!live.ok) {
    return {
      source: "sample",
      timezone: "America/Denver",
      asOf,
      credentialMode: config.mode,
      sessions: sampleStretchSessions(),
      selected: null,
      note: `RTI live fetch failed (${live.message}). Showing sample options.`,
      loginUrl,
      error: live.message,
    };
  }

  const selected = live.info.selectedSession
    ? normalizeOpenSession(live.info.selectedSession)
    : null;

  const resolvedLogin =
    live.ctx.schoolId != null
      ? `${config.baseUrl}/ui/school-timeline/${encodeURIComponent(live.ctx.schoolId)}`
      : loginUrl;

  return {
    source: "live",
    timezone: "America/Denver",
    asOf,
    credentialMode: config.mode,
    sessions: live.sessions,
    selected,
    selfEnrolled: Boolean(live.info.selfEnrolled),
    loginUrl: resolvedLogin,
    autoEnrolled: false,
  };
}

export async function enrollStretchOption(
  sessionId: string,
  opts?: { sessionName?: string; autoSelected?: boolean },
): Promise<StretchEnrollResponse> {
  const asOf = new Date().toISOString();
  const config = getRtiConfig();
  const autoSelected = Boolean(opts?.autoSelected);
  const loginUrl = rtiLoginUrl(config);

  if (config.mode === "none") {
    const samples = sampleStretchSessions();
    const match =
      samples.find((s) => s.sessionId === sessionId) ??
      (opts?.sessionName
        ? samples.find((s) => s.name === opts.sessionName)
        : null) ??
      samples.find((s) => s.isPeStretch) ??
      samples[0];

    return {
      source: "sample",
      timezone: "America/Denver",
      asOf,
      ok: true,
      mocked: true,
      sessionId: match.sessionId,
      sessionName: match.name,
      autoSelected,
      note: "Mock enrollment — RTI school-timeline secrets are not set. Add SESSION + XSRF (Mac SSO once) to enroll for real.",
      loginUrl,
    };
  }

  const live = await fetchLiveStretchInfo(config);
  if (!live.ok) {
    return {
      source: "live",
      timezone: "America/Denver",
      asOf,
      ok: false,
      mocked: false,
      sessionId,
      sessionName: opts?.sessionName ?? sessionId,
      autoSelected,
      note: live.message,
      error: live.message,
      loginUrl,
    };
  }

  let target =
    live.sessions.find((s) => s.sessionId === sessionId) ??
    (opts?.sessionName
      ? live.sessions.find((s) => s.name === opts.sessionName)
      : undefined);

  if (!target && opts?.sessionName && isPeStretchName(opts.sessionName)) {
    target = findPeStretch(live.sessions) ?? undefined;
  }

  if (!target) {
    return {
      source: "live",
      timezone: "America/Denver",
      asOf,
      ok: false,
      mocked: false,
      sessionId,
      sessionName: opts?.sessionName ?? sessionId,
      autoSelected,
      note: "That session is not in today’s open list on RTI Scheduler.",
      error: "session_not_found",
      loginUrl,
    };
  }

  if (live.info.selfEnrolled && live.info.selectedSession) {
    const already = normalizeOpenSession(live.info.selectedSession);
    if (already && already.sessionId === target.sessionId) {
      return {
        source: "live",
        timezone: "America/Denver",
        asOf,
        ok: true,
        mocked: false,
        sessionId: already.sessionId,
        sessionName: already.name,
        autoSelected,
        note: "Already enrolled in this session on RTI Scheduler.",
        loginUrl,
      };
    }
  }

  const enrolled = await enrollInStretchSession(
    target.sessionId,
    config,
    live.ctx,
  );
  if (!enrolled.ok) {
    return {
      source: "live",
      timezone: "America/Denver",
      asOf,
      ok: false,
      mocked: false,
      sessionId: target.sessionId,
      sessionName: target.name,
      autoSelected,
      note: enrolled.message,
      error: enrolled.message,
      loginUrl,
    };
  }

  return {
    source: "live",
    timezone: "America/Denver",
    asOf,
    ok: true,
    mocked: false,
    sessionId: target.sessionId,
    sessionName: target.name,
    autoSelected,
    note: autoSelected
      ? "Auto-enrolled in PE Stretch on RTI Scheduler after the 8:00 AM Denver deadline."
      : "Enrolled on RTI Scheduler (school-timeline).",
    loginUrl,
  };
}
