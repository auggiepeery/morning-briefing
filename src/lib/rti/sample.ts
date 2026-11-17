import type { StretchSessionOption } from "../types";

export const SAMPLE_STRETCH_NOTE =
  "Sample stretch options — add school-timeline SSO secrets (SESSION + XSRF from a one-time Mac login) to enroll for real on rtischeduler.com. iPhone alone can’t copy HttpOnly cookies.";

export function sampleStretchSessions(): StretchSessionOption[] {
  return [
    {
      sessionId: "sample-pe-stretch",
      name: "PE Stretch",
      instructor: "Coach Ramirez",
      department: "PE",
      courseName: null,
      seatsLabel: "18 / 30",
      isPeStretch: true,
    },
    {
      sessionId: "sample-library-quiet",
      name: "Quiet Study — Library",
      instructor: "Ms. Chen",
      department: "Library",
      courseName: null,
      seatsLabel: "12 / 24",
      isPeStretch: false,
    },
    {
      sessionId: "sample-math-lab",
      name: "Math Lab",
      instructor: "Mr. Ortiz",
      department: "Math",
      courseName: "Algebra II",
      seatsLabel: "8 / 16",
      isPeStretch: false,
    },
    {
      sessionId: "sample-band-rehearsal",
      name: "Band Rehearsal",
      instructor: "Ms. Hale",
      department: "Fine Arts",
      courseName: null,
      seatsLabel: "22 / 28",
      isPeStretch: false,
    },
  ];
}
