export const DEFAULT_RTI_BASE_URL = "https://www.rtischeduler.com";

export type RtiCredentialMode = "email_keys" | "session_cookie" | "none";

export type RtiConfig = {
  baseUrl: string;
  mode: RtiCredentialMode;
  studentSelfEnrollKey: string | null;
  scheduleSelfEnrollmentKey: string | null;
  sessionCookie: string | null;
  studentId: string | null;
  sessionScheduleId: string | null;
  xsrfToken: string | null;
};

function trimOrNull(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function getRtiConfig(): RtiConfig {
  const baseUrl =
    trimOrNull(process.env.RTI_BASE_URL) ?? DEFAULT_RTI_BASE_URL;

  const studentSelfEnrollKey = trimOrNull(
    process.env.RTI_STUDENT_SELF_ENROLL_KEY,
  );
  const scheduleSelfEnrollmentKey = trimOrNull(
    process.env.RTI_SCHEDULE_SELF_ENROLLMENT_KEY,
  );
  const sessionCookie = trimOrNull(process.env.RTI_SESSION_COOKIE);
  const studentId = trimOrNull(process.env.RTI_STUDENT_ID);
  const sessionScheduleId = trimOrNull(process.env.RTI_SESSION_SCHEDULE_ID);
  const xsrfToken = trimOrNull(process.env.RTI_XSRF_TOKEN);

  let mode: RtiCredentialMode = "none";
  if (studentSelfEnrollKey && scheduleSelfEnrollmentKey) {
    mode = "email_keys";
  } else if (sessionCookie && studentId && sessionScheduleId) {
    mode = "session_cookie";
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    mode,
    studentSelfEnrollKey,
    scheduleSelfEnrollmentKey,
    sessionCookie,
    studentId,
    sessionScheduleId,
    xsrfToken,
  };
}

export function rtiCredentialsConfigured(config: RtiConfig = getRtiConfig()): boolean {
  return config.mode !== "none";
}
