import type { CanvasAssignmentsResponse } from "../types";
import { TIMEZONE } from "../denver";
import { sampleCanvasAssignments } from "./sample";

/** Public-safe stub — sample assignments only. Never reads Canvas tokens. */
export async function fetchMissingAssignments(): Promise<CanvasAssignmentsResponse> {
  return {
    source: "sample",
    timezone: TIMEZONE,
    asOf: new Date().toISOString(),
    assignments: sampleCanvasAssignments(),
    note: "Sample Canvas work — live LMS tokens are not shipped in this public build.",
  };
}
