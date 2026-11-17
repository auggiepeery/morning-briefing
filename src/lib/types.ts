export type DataSource = "live" | "sample";

export type WeatherCondition =
  | "clear"
  | "clear-night"
  | "partly-cloudy"
  | "overcast"
  | "cloudy-night"
  | "fog"
  | "rain"
  | "snow"
  | "storm";

export type WeatherResponse = {
  source: "live" | "fallback";
  timezone: "America/Denver";
  asOf: string;
  place: string;
  latitude: number;
  longitude: number;
  temperatureF: number | null;
  weatherCode: number | null;
  isDay: boolean;
  condition: WeatherCondition;
  summary: string;
  /** e.g. "42° · Snow in Midway"; null when fallback has no reading */
  line: string | null;
  note?: string;
};

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
  sessionId?: string;
  sessionName: string;
  autoSelected: boolean;
  markedAt: string;
  confirmedOnRti: boolean;
  mocked?: boolean;
  source?: DataSource;
};

export type StretchSessionOption = {
  sessionId: string;
  name: string;
  instructor: string | null;
  department: string | null;
  courseName: string | null;
  seatsLabel: string | null;
  isPeStretch: boolean;
};

export type StretchSessionsResponse = {
  source: DataSource;
  timezone: "America/Denver";
  asOf: string;
  credentialMode: "session_cookie" | "email_keys" | "none";
  sessions: StretchSessionOption[];
  selected: StretchSessionOption | null;
  selfEnrolled?: boolean;
  autoEnrolled?: boolean;
  note?: string;
  error?: string;
  loginUrl?: string;
  isStretchMorning?: boolean;
  deadlinePassed?: boolean;
  deadlineHour?: number;
  dateKey?: string;
};

export type StretchEnrollResponse = {
  source: DataSource;
  timezone: "America/Denver";
  asOf: string;
  ok: boolean;
  mocked: boolean;
  sessionId: string;
  sessionName: string;
  autoSelected: boolean;
  note?: string;
  error?: string;
  loginUrl?: string;
};
