import type { StretchPick, StretchSessionOption, StretchSessionsResponse } from "./types";
import {
  getDenverParts,
  isStretchDay,
  stretchDeadlinePassed,
  type DenverParts,
} from "./denver";

export const RTI_SCHEDULER_URL = "https://rtischeduler.com";
export const RTI_LOGIN_URL = "https://www.rtischeduler.com/choose-login";
export const PE_STRETCH_NAME = "PE Stretch";
export const STRETCH_DEADLINE_HOUR = 8;
export const STRETCH_STORAGE_PREFIX = "firstlight-stretch:";

export type StretchUiState = {
  isStretchMorning: boolean;
  deadlineHour: number;
  deadlinePassed: boolean;
  dateKey: string;
  pick: StretchPick | null;
  sessions: StretchSessionOption[];
  source: StretchSessionsResponse["source"] | null;
  credentialMode: StretchSessionsResponse["credentialMode"] | null;
  note: string | null;
  loginUrl: string;
  enrollingId: string | null;
  error: string | null;
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

/**
 * Resolve today's stretch pick: honor stored choice any day; after 8am Mon/Wed
 * Denver with no pick, auto-select PE Stretch (server also attempts RTI enroll).
 */
export function resolveStretchPick(
  parts: DenverParts = getDenverParts(),
  existing: StretchPick | null = null,
): StretchPick | null {
  if (existing && existing.dateKey === parts.dateKey) return existing;

  if (!isStretchDay(parts)) return null;

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

export function emptyStretchUiState(
  parts: DenverParts = getDenverParts(),
): StretchUiState {
  const isStretchMorning = isStretchDay(parts);
  const existing = readStretchPick(parts.dateKey);
  const pick = resolveStretchPick(parts, existing);

  if (
    pick &&
    pick.autoSelected &&
    (!existing || existing.sessionName !== pick.sessionName)
  ) {
    writeStretchPick(pick);
  }

  return {
    isStretchMorning,
    deadlineHour: STRETCH_DEADLINE_HOUR,
    deadlinePassed: stretchDeadlinePassed(parts, STRETCH_DEADLINE_HOUR),
    dateKey: parts.dateKey,
    pick,
    sessions: [],
    source: null,
    credentialMode: null,
    note: null,
    loginUrl: RTI_LOGIN_URL,
    enrollingId: null,
    error: null,
  };
}
