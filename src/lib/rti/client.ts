import { RTI_LOGIN_URL } from "../stretch";
import type {
  StretchEnrollResponse,
  StretchSessionOption,
  StretchSessionsResponse,
} from "../types";
import { SAMPLE_STRETCH_NOTE, sampleStretchSessions } from "./sample";

export function findPeStretch(
  sessions: StretchSessionOption[],
): StretchSessionOption | null {
  return sessions.find((s) => s.isPeStretch) ?? null;
}

/** Public-safe stub — sample options only. Never calls RTI with owner cookies. */
export async function getStretchSessions(): Promise<StretchSessionsResponse> {
  return {
    source: "sample",
    timezone: "America/Denver",
    asOf: new Date().toISOString(),
    credentialMode: "none",
    sessions: sampleStretchSessions(),
    selected: null,
    note: `${SAMPLE_STRETCH_NOTE} Live RTI enroll is not shipped in this public build.`,
    loginUrl: RTI_LOGIN_URL,
    autoEnrolled: false,
  };
}

/** Public-safe stub — local mock enroll only. Never POSTs to RTI. */
export async function enrollStretchOption(
  sessionId: string,
  opts?: { sessionName?: string; autoSelected?: boolean },
): Promise<StretchEnrollResponse> {
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
    asOf: new Date().toISOString(),
    ok: true,
    mocked: true,
    sessionId: match.sessionId,
    sessionName: match.name,
    autoSelected: Boolean(opts?.autoSelected),
    note: "Mock enrollment only — live RTI school-timeline enroll is not shipped in this public build.",
    loginUrl: RTI_LOGIN_URL,
  };
}
