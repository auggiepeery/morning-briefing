export const DEFAULT_RTI_BASE_URL = "https://www.rtischeduler.com";

export type RtiCredentialMode = "session_cookie" | "email_keys" | "none";

export type RtiConfig = {
  baseUrl: string;
  mode: RtiCredentialMode;
  /** Preferred: school-timeline SSO SESSION cookie value (not the cookie name). */
  sessionCookie: string | null;
  studentId: string | null;
  sessionScheduleId: string | null;
  schoolId: string | null;
  xsrfToken: string | null;
  /** Legacy: Choose a Session email deep-link keys (not used when SESSION is set). */
  studentSelfEnrollKey: string | null;
  scheduleSelfEnrollmentKey: string | null;
};

function trimOrNull(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function getRtiConfig(): RtiConfig {
  const baseUrl =
    trimOrNull(process.env.RTI_BASE_URL) ?? DEFAULT_RTI_BASE_URL;

  const sessionCookie = trimOrNull(process.env.RTI_SESSION_COOKIE);
  const studentId = trimOrNull(process.env.RTI_STUDENT_ID);
  const sessionScheduleId = trimOrNull(process.env.RTI_SESSION_SCHEDULE_ID);
  const schoolId = trimOrNull(process.env.RTI_SCHOOL_ID);
  const xsrfToken = trimOrNull(process.env.RTI_XSRF_TOKEN);

  const studentSelfEnrollKey = trimOrNull(
    process.env.RTI_STUDENT_SELF_ENROLL_KEY,
  );
  const scheduleSelfEnrollmentKey = trimOrNull(
    process.env.RTI_SCHEDULE_SELF_ENROLLMENT_KEY,
  );

  // Prefer school-timeline SSO SESSION cookie over email deep-link keys.
  let mode: RtiCredentialMode = "none";
  if (sessionCookie) {
    mode = "session_cookie";
  } else if (studentSelfEnrollKey && scheduleSelfEnrollmentKey) {
    mode = "email_keys";
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    mode,
    sessionCookie,
    studentId,
    sessionScheduleId,
    schoolId,
    xsrfToken,
    studentSelfEnrollKey,
    scheduleSelfEnrollmentKey,
  };
}

export function rtiCredentialsConfigured(
  config: RtiConfig = getRtiConfig(),
): boolean {
  return config.mode !== "none";
}

export function rtiLoginUrl(config: RtiConfig = getRtiConfig()): string {
  if (config.schoolId) {
    return `${config.baseUrl}/ui/school-timeline/${encodeURIComponent(config.schoolId)}`;
  }
  return `${config.baseUrl}/choose-login`;
}
