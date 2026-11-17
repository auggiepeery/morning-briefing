import type { StretchPick } from "./types";
import {
  getDenverParts,
  isStretchDay,
  stretchDeadlinePassed,
  type DenverParts,
} from "./denver";

export const RTI_SCHEDULER_URL = "https://rtischeduler.com";
export const PE_STRETCH_NAME = "PE Stretch";
export const STRETCH_DEADLINE_HOUR = 8;
export const STRETCH_STORAGE_PREFIX = "firstlight-stretch:";

export type StretchUiState = {
  isStretchMorning: boolean;
  deadlineHour: number;
  deadlinePassed: boolean;
  dateKey: string;
  pick: StretchPick | null;
  steps: string[];
};

export function storageKeyForDate(dateKey: string): string {
  return `${STRETCH_STORAGE_PREFIX}${dateKey}`;
}

export function readStretchPick(dateKey: string): StretchPick | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKeyForDate(dateKey));
    if (!raw) return null;
    return JSON.parse(raw) as StretchPick;
  } catch {
    return null;
  }
}

export function writeStretchPick(pick: StretchPick): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKeyForDate(pick.dateKey), JSON.stringify(pick));
}

export function clearStretchPick(dateKey: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKeyForDate(dateKey));
}

export const STRETCH_STEPS = [
  "Open RTI Scheduler and sign in with your school Google or Microsoft account.",
  "Or tap “Choose a Session” in the school email reminder if you have one.",
  "Browse open sessions for today’s stretch / flex period.",
  "Pick your session (or PE Stretch) and confirm enrollment on the site.",
  "Come back here and tap Mark picked — or we’ll auto-select PE Stretch after 8:00 AM if you haven’t.",
];

/**
 * Resolve today's stretch pick: honor stored choice; after 8am Mon/Wed
 * Denver with no pick, auto-select PE Stretch locally (RTI still needs
 * school SSO — we cannot enroll remotely without credentials).
 */
export function resolveStretchPick(
  parts: DenverParts = getDenverParts(),
  existing: StretchPick | null = null,
): StretchPick | null {
  if (!isStretchDay(parts)) return null;

  if (existing && existing.dateKey === parts.dateKey) return existing;

  if (stretchDeadlinePassed(parts, STRETCH_DEADLINE_HOUR)) {
    return {
      dateKey: parts.dateKey,
      sessionName: PE_STRETCH_NAME,
      autoSelected: true,
      markedAt: new Date().toISOString(),
      confirmedOnRti: false,
    };
  }

  return null;
}

export function buildStretchUiState(
  forceShow = false,
  parts: DenverParts = getDenverParts(),
): StretchUiState {
  const show = forceShow || isStretchDay(parts);
  const existing = show ? readStretchPick(parts.dateKey) : null;
  let pick = show ? resolveStretchPick(parts, existing) : null;

  if (
    pick &&
    pick.autoSelected &&
    (!existing || existing.sessionName !== pick.sessionName)
  ) {
    writeStretchPick(pick);
  }

  return {
    isStretchMorning: show,
    deadlineHour: STRETCH_DEADLINE_HOUR,
    deadlinePassed: stretchDeadlinePassed(parts, STRETCH_DEADLINE_HOUR),
    dateKey: parts.dateKey,
    pick,
    steps: STRETCH_STEPS,
  };
}
