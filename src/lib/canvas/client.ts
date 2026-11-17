import type { CanvasAssignment, CanvasAssignmentsResponse } from "../types";
import { TIMEZONE } from "../denver";
import { DEFAULT_CANVAS_BASE_URL } from "./config";
import { SAMPLE_CANVAS_NOTE, sampleCanvasAssignments } from "./sample";

type CanvasTodoItem = {
  assignment?: {
    id: number;
    name: string;
    due_at: string | null;
    html_url: string;
    points_possible: number | null;
    course_id: number;
  };
  context_name?: string;
};

type CanvasCourse = {
  id: number;
  name: string;
};

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

function classifyDue(dueAt: string | null, now: Date): CanvasAssignment["status"] {
  if (!dueAt) return "upcoming";
  const due = new Date(dueAt).getTime();
  const t = now.getTime();
  if (due < t) return "overdue";
  const hours = (due - t) / (1000 * 60 * 60);
  if (hours <= 36) return "due_soon";
  return "upcoming";
}

async function canvasGet<T>(
  baseUrl: string,
  token: string,
  path: string,
  query: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${baseUrl}${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Canvas ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/**
 * Live Canvas LMS client. Swap is local: this module reads process.env only.
 * Never expose CANVAS_ACCESS_TOKEN to the browser.
 *
 * Base URL defaults to Wasatch Canvas; override with CANVAS_BASE_URL.
 * Live data also needs CANVAS_ACCESS_TOKEN.
 */
export async function fetchMissingAssignments(): Promise<CanvasAssignmentsResponse> {
  const baseUrl = normalizeBaseUrl(
    process.env.CANVAS_BASE_URL?.trim() || DEFAULT_CANVAS_BASE_URL,
  );
  const token = process.env.CANVAS_ACCESS_TOKEN?.trim() ?? "";
  const asOf = new Date().toISOString();

  if (!token) {
    return {
      source: "sample",
      timezone: TIMEZONE,
      asOf,
      assignments: sampleCanvasAssignments(),
      note: `${SAMPLE_CANVAS_NOTE} Host ready: ${baseUrl}. Waiting on CANVAS_ACCESS_TOKEN.`,
    };
  }

  try {
    const [todos, courses] = await Promise.all([
      canvasGet<CanvasTodoItem[]>(baseUrl, token, "/api/v1/users/self/todo", {
        per_page: "50",
      }),
      canvasGet<CanvasCourse[]>(baseUrl, token, "/api/v1/courses", {
        enrollment_state: "active",
        per_page: "100",
      }),
    ]);

    const courseNames = new Map(courses.map((c) => [c.id, c.name]));
    const now = new Date();

    const assignments: CanvasAssignment[] = todos
      .filter((t) => t.assignment)
      .map((t) => {
        const a = t.assignment!;
        return {
          id: String(a.id),
          name: a.name,
          courseName: t.context_name || courseNames.get(a.course_id) || `Course ${a.course_id}`,
          dueAt: a.due_at,
          htmlUrl: a.html_url,
          pointsPossible: a.points_possible,
          status: classifyDue(a.due_at, now),
        };
      })
      .sort((a, b) => {
        const rank = { overdue: 0, due_soon: 1, upcoming: 2 } as const;
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        const da = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
        return da - db;
      });

    return {
      source: "live",
      timezone: TIMEZONE,
      asOf,
      assignments,
      note: `Live from ${baseUrl}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Canvas error";
    return {
      source: "sample",
      timezone: TIMEZONE,
      asOf,
      assignments: sampleCanvasAssignments(),
      note: `Canvas live fetch failed (${message}). Showing sample data. Host: ${baseUrl}`,
    };
  }
}
