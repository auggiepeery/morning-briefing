"use client";

import { useEffect, useState } from "react";
import type {
  CalendarEventsResponse,
  CanvasAssignmentsResponse,
} from "@/lib/types";
import {
  formatDenverDateLong,
  getDenverParts,
  greetingForHour,
} from "@/lib/denver";
import {
  PE_STRETCH_NAME,
  RTI_SCHEDULER_URL,
  STRETCH_STEPS,
  buildStretchUiState,
  clearStretchPick,
  writeStretchPick,
  type StretchUiState,
} from "@/lib/stretch";
import styles from "./MorningBrief.module.css";

export function MorningBrief() {
  const [now, setNow] = useState<Date | null>(null);
  const [canvas, setCanvas] = useState<CanvasAssignmentsResponse | null>(null);
  const [calendar, setCalendar] = useState<CalendarEventsResponse | null>(null);
  const [stretch, setStretch] = useState<StretchUiState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setNow(new Date());

    async function load() {
      try {
        const [cRes, gRes] = await Promise.all([
          fetch("/api/canvas/assignments", { cache: "no-store" }),
          fetch("/api/calendar/events", { cache: "no-store" }),
        ]);
        if (!cRes.ok || !gRes.ok) throw new Error("Briefing APIs unavailable");
        const cJson = (await cRes.json()) as CanvasAssignmentsResponse;
        const gJson = (await gRes.json()) as CalendarEventsResponse;
        if (cancelled) return;
        setCanvas(cJson);
        setCalendar(gJson);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Load failed");
        }
      }
    }

    const forceStretch = new URLSearchParams(window.location.search).has("stretch");
    setStretch(buildStretchUiState(forceStretch));
    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const parts = now ? getDenverParts(now) : null;
  const greeting = parts ? greetingForHour(parts.hour) : "Good morning";
  const dateLabel = now ? formatDenverDateLong(now) : "Loading date…";

  function markPicked(sessionName: string, confirmedOnRti: boolean) {
    if (!stretch) return;
    const pick = {
      dateKey: stretch.dateKey,
      sessionName,
      autoSelected: false,
      markedAt: new Date().toISOString(),
      confirmedOnRti,
    };
    writeStretchPick(pick);
    setStretch({ ...stretch, pick });
  }

  function resetPick() {
    if (!stretch) return;
    clearStretchPick(stretch.dateKey);
    setStretch(buildStretchUiState(stretch.isStretchMorning));
  }

  return (
    <div className={styles.shell}>
      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.sun} />
        <div className={styles.haze} />
        <div className={styles.grain} />
      </div>

      <header className={styles.hero}>
        <p className={styles.brand}>Firstlight</p>
        <h1 className={styles.headline}>
          {greeting}.
          <span className={styles.headlineDate}> {dateLabel}</span>
        </h1>
        <p className={styles.lede}>
          Your morning line — missing work, today’s calendar, and stretch when
          it counts.
        </p>
        <p className={styles.tz}>America/Denver</p>
      </header>

      <main className={styles.brief}>
        {loadError ? <p className={styles.error}>{loadError}</p> : null}

        <section className={styles.section} aria-labelledby="canvas-heading">
          <div className={styles.sectionHead}>
            <h2 id="canvas-heading">Missing work</h2>
            {canvas ? (
              <span
                className={
                  canvas.source === "sample" ? styles.badgeSample : styles.badgeLive
                }
              >
                {canvas.source === "sample" ? "Sample data" : "Live Canvas"}
              </span>
            ) : (
              <span className={styles.badgeMuted}>Loading…</span>
            )}
          </div>
          {canvas?.note ? <p className={styles.note}>{canvas.note}</p> : null}
          <ul className={styles.list}>
            {(canvas?.assignments ?? []).map((a, i) => (
              <li
                key={a.id}
                className={styles.row}
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className={styles.rowMain}>
                  <span className={`${styles.status} ${styles[a.status]}`}>
                    {a.status.replace("_", " ")}
                  </span>
                  <a className={styles.rowTitle} href={a.htmlUrl} target="_blank" rel="noreferrer">
                    {a.name}
                  </a>
                  <span className={styles.rowMeta}>{a.courseName}</span>
                </div>
                <div className={styles.rowAside}>
                  {a.dueAt
                    ? new Intl.DateTimeFormat("en-US", {
                        timeZone: "America/Denver",
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(a.dueAt))
                    : "No due date"}
                </div>
              </li>
            ))}
            {canvas && canvas.assignments.length === 0 ? (
              <li className={styles.empty}>Nothing missing. Clear skies.</li>
            ) : null}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="cal-heading">
          <div className={styles.sectionHead}>
            <h2 id="cal-heading">Today’s calendar</h2>
            {calendar ? (
              <span
                className={
                  calendar.source === "sample" ? styles.badgeSample : styles.badgeLive
                }
              >
                {calendar.source === "sample" ? "Sample data" : "Live Google"}
              </span>
            ) : (
              <span className={styles.badgeMuted}>Loading…</span>
            )}
          </div>
          {calendar?.note ? <p className={styles.note}>{calendar.note}</p> : null}
          {!calendar?.connected && calendar?.oauthConfigured === false ? (
            <p className={styles.note}>
              Optional:{" "}
              <a href="/api/google/oauth/start">Connect Google Calendar</a> after
              client secrets are set.
            </p>
          ) : null}
          <ul className={styles.list}>
            {(calendar?.events ?? []).map((e, i) => (
              <li
                key={e.id}
                className={styles.row}
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className={styles.rowMain}>
                  <span className={styles.time}>
                    {e.allDay
                      ? "All day"
                      : new Intl.DateTimeFormat("en-US", {
                          timeZone: "America/Denver",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(e.start))}
                  </span>
                  {e.htmlLink ? (
                    <a
                      className={styles.rowTitle}
                      href={e.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {e.title}
                    </a>
                  ) : (
                    <span className={styles.rowTitle}>{e.title}</span>
                  )}
                  {e.location ? (
                    <span className={styles.rowMeta}>{e.location}</span>
                  ) : null}
                </div>
              </li>
            ))}
            {calendar && calendar.events.length === 0 ? (
              <li className={styles.empty}>No events in range.</li>
            ) : null}
          </ul>
        </section>

        {stretch?.isStretchMorning ? (
          <section className={styles.section} aria-labelledby="stretch-heading">
            <div className={styles.sectionHead}>
              <h2 id="stretch-heading">Stretch</h2>
              <span className={styles.badgeStretch}>Mon / Wed</span>
            </div>
            <p className={styles.note}>
              Pick on{" "}
              <a href={RTI_SCHEDULER_URL} target="_blank" rel="noreferrer">
                rtischeduler.com
              </a>{" "}
              before {stretch.deadlineHour}:00 AM Denver. Unpicked → auto PE
              Stretch.
            </p>

            {stretch.pick ? (
              <div className={styles.stretchResult}>
                <p className={styles.stretchPick}>
                  {stretch.pick.autoSelected ? "Auto-selected: " : "Picked: "}
                  <strong>{stretch.pick.sessionName}</strong>
                </p>
                {!stretch.pick.confirmedOnRti ? (
                  <p className={styles.note}>
                    Local reminder only — still confirm on RTI Scheduler (school
                    SSO). Automation needs school login cookies we do not store.
                  </p>
                ) : null}
                <div className={styles.actions}>
                  <a
                    className={styles.btnPrimary}
                    href={RTI_SCHEDULER_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open RTI Scheduler
                  </a>
                  {!stretch.pick.confirmedOnRti ? (
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() =>
                        markPicked(stretch.pick!.sessionName, true)
                      }
                    >
                      Mark confirmed on RTI
                    </button>
                  ) : null}
                  <button type="button" className={styles.btnGhost} onClick={resetPick}>
                    Reset pick
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.stretchFlow}>
                <ol className={styles.steps}>
                  {STRETCH_STEPS.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <div className={styles.actions}>
                  <a
                    className={styles.btnPrimary}
                    href={RTI_SCHEDULER_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open RTI Scheduler
                  </a>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => markPicked(PE_STRETCH_NAME, false)}
                  >
                    Mark PE Stretch
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => {
                      const name = window.prompt("Session name you picked?");
                      if (name?.trim()) markPicked(name.trim(), false);
                    }}
                  >
                    Mark other pick
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className={styles.sectionQuiet}>
            <p>
              Stretch picking shows Monday and Wednesday mornings. Preview anytime
              with <code>?stretch</code>.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
