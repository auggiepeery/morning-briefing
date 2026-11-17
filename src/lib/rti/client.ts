import { PE_STRETCH_NAME } from "../stretch";
import type {
  StretchEnrollResponse,
  StretchSessionOption,
  StretchSessionsResponse,
} from "../types";
import { getRtiConfig, type RtiConfig } from "./config";
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

function sessionsPath(config: RtiConfig): string {
  if (config.mode === "email_keys") {
    return `${config.baseUrl}/self-enrollment-api/operations/self-enrollment/student/${encodeURIComponent(config.studentSelfEnrollKey!)}/schedule/${encodeURIComponent(config.scheduleSelfEnrollmentKey!)}`;
  }
  return `${config.baseUrl}/self-enrollment-api/operations/self-enrollment/student/${encodeURIComponent(config.studentId!)}/schedule/${encodeURIComponent(config.sessionScheduleId!)}/logged-in-self-enrollment`;
}

function enrollPath(config: RtiConfig, sessionId: string): string {
  if (config.mode === "email_keys") {
    return `${config.baseUrl}/self-enrollment-api/operations/self-enrollment/student/${encodeURIComponent(config.studentSelfEnrollKey!)}/session/${encodeURIComponent(sessionId)}`;
  }
  return `${config.baseUrl}/self-enrollment-api/operations/self-enrollment/student/${encodeURIComponent(config.studentId!)}/session/${encodeURIComponent(sessionId)}/logged-in-self-enrollment`;
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
      return {
        ok: false,
        status: res.status,
        message: fromBody || `RTI ${res.status}: ${text.slice(0, 180)}`,
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

export async function fetchLiveStretchInfo(
  config: RtiConfig = getRtiConfig(),
): Promise<
  | { ok: true; info: RtiSelfEnrollmentInfo; sessions: StretchSessionOption[] }
  | { ok: false; message: string; status: number }
> {
  if (config.mode === "none") {
    return { ok: false, status: 0, message: "RTI credentials not configured" };
  }

  const result = await rtiFetchJson<RtiSelfEnrollmentInfo>(sessionsPath(config), {
    method: "GET",
    headers: authHeaders(config),
  });

  if (!result.ok) return result;

  const sessions = (result.data.openSessions ?? [])
    .map(normalizeOpenSession)
    .filter((s): s is StretchSessionOption => Boolean(s));

  return { ok: true, info: result.data, sessions };
}

export async function enrollInStretchSession(
  sessionId: string,
  config: RtiConfig = getRtiConfig(),
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  if (config.mode === "none") {
    return { ok: false, status: 0, message: "RTI credentials not configured" };
  }

  const result = await rtiFetchJson<unknown>(enrollPath(config, sessionId), {
    method: "POST",
    headers: {
      ...authHeaders(config),
      "Content-Type": "application/json",
    },
    body: null,
  });

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
      loginUrl: `${config.baseUrl}/choose-login`,
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
      loginUrl: `${config.baseUrl}/choose-login`,
      error: live.message,
    };
  }

  const selected = live.info.selectedSession
    ? normalizeOpenSession(live.info.selectedSession)
    : null;

  return {
    source: "live",
    timezone: "America/Denver",
    asOf,
    credentialMode: config.mode,
    sessions: live.sessions,
    selected,
    selfEnrolled: Boolean(live.info.selfEnrolled),
    loginUrl: `${config.baseUrl}/choose-login`,
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
      note: "Mock enrollment — RTI credentials are not set. Add self-enroll keys or a SESSION cookie to enroll for real.",
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
      };
    }
  }

  const enrolled = await enrollInStretchSession(target.sessionId, config);
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
      loginUrl: `${config.baseUrl}/choose-login`,
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
      : "Enrolled on RTI Scheduler.",
  };
}
