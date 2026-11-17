export type DataSource = "live" | "sample";

export type CanvasAssignment = {
  id: string;
  name: string;
  courseName: string;
  dueAt: string | null;
  htmlUrl: string;
  pointsPossible: number | null;
  status: "overdue" | "due_soon" | "upcoming";
};

export type CanvasAssignmentsResponse = {
  source: DataSource;
  timezone: "America/Denver";
  asOf: string;
  assignments: CanvasAssignment[];
  note?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
};

export type CalendarEventsResponse = {
  source: DataSource;
  timezone: "America/Denver";
  asOf: string;
  rangeStart: string;
  rangeEnd: string;
  events: CalendarEvent[];
  note?: string;
  oauthConfigured?: boolean;
  connected?: boolean;
};

export type StretchPick = {
  dateKey: string;
  sessionName: string;
  autoSelected: boolean;
  markedAt: string;
  confirmedOnRti: boolean;
};
