"use client";

import { useEffect, useState } from "react";
import type {
  CalendarEventsResponse,
  CanvasAssignmentsResponse,
  StretchEnrollResponse,
  StretchSessionsResponse,
  WeatherResponse,
} from "@/lib/types";
import {
  formatDenverDateLong,
  getDenverParts,
  greetingForHour,
} from "@/lib/denver";
import {
  RTI_SCHEDULER_URL,
  clearStretchPick,
  emptyStretchUiState,
  writeStretchPick,
  type StretchUiState,
} from "@/lib/stretch";
import styles from "./MorningBrief.module.css";

type Props = {
  initialWeather: WeatherResponse;
};

const CONDITION_CLASS: Record<WeatherResponse["condition"], string> = {
  clear: styles.condClear,
  "clear-night": styles.condClearNight,
  "partly-cloudy": styles.condPartlyCloudy,
  overcast: styles.condOvercast,
  "cloudy-night": styles.condCloudyNight,
  fog: styles.condFog,
  rain: styles.condRain,
  snow: styles.condSnow,
  storm: styles.condStorm,
};

export function MorningBrief({ initialWeather }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [weather] = useState(initialWeather);
  const [canvas, setCanvas] = useState<CanvasAssignmentsResponse | null>(null);
  const [calendar, setCalendar] = useState<CalendarEventsResponse | null>(null);
  const [stretch, setStretch] = useState<StretchUiState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setNow(new Date());

    async function load() {
      setStretch(emptyStretchUiState());

      try {
        const [cRes, gRes, sRes] = await Promise.all([
          fetch("/api/canvas/assignments", { cache: "no-store" }),
          fetch("/api/calendar/events", { cache: "no-store" }),
          fetch("/api/stretch/sessions", { cache: "no-store" }),
        ]);
        if (!cRes.ok || !gRes.ok) throw new Error("Briefing APIs unavailable");
        const cJson = (await cRes.json()) as CanvasAssignmentsResponse;
        const gJson = (await gRes.json()) as CalendarEventsResponse;
        const sJson = sRes.ok
          ? ((await sRes.json()) as StretchSessionsResponse)
          : null;
        if (cancelled) return;
        setCanvas(cJson);
        setCalendar(gJson);

        if (sJson) {
          const local = emptyStretchUiState();
          let pick = local.pick;
          if (sJson.selected) {
            pick = {
              dateKey: sJson.dateKey ?? local.dateKey,
              sessionId: sJson.selected.sessionId,
              sessionName: sJson.selected.name,
              autoSelected: Boolean(sJson.autoEnrolled),
              markedAt: sJson.asOf,
              confirmedOnRti: Boolean(sJson.selfEnrolled),
              mocked: sJson.source === "sample",
              source: sJson.source,
            };
            writeStretchPick(pick);
          } else if (pick?.autoSelected && sJson.sessions.length) {
            // Keep local PE reminder until server enroll lands.
          }

          setStretch({
            ...local,
            isStretchMorning: Boolean(sJson.isStretchMorning),
            deadlinePassed: Boolean(sJson.deadlinePassed),
            deadlineHour: sJson.deadlineHour ?? local.deadlineHour,
            dateKey: sJson.dateKey ?? local.dateKey,
            pick,
            sessions: sJson.sessions,
            source: sJson.source,
            credentialMode: sJson.credentialMode,
            note: sJson.note ?? null,
            loginUrl: sJson.loginUrl ?? RTI_SCHEDULER_URL,
            error: sJson.error ?? null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Load failed");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const parts = now ? getDenverParts(now) : null;
  const greeting = parts ? greetingForHour(parts.hour) : "Good morning";
  const dateLabel = now ? formatDenverDateLong(now) : "Loading date…";

  async function enrollOption(
    sessionId: string,
    sessionName: string,
    autoSelected = false,
  ) {
    if (!stretch) return;
    setStretch({ ...stretch, enrollingId: sessionId, error: null });
    try {
      const res = await fetch("/api/stretch/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sessionName, autoSelected }),
      });
      const json = (await res.json()) as StretchEnrollResponse;
      const pick = {
        dateKey: stretch.dateKey,
        sessionId: json.sessionId,
        sessionName: json.sessionName,
        autoSelected: json.autoSelected,
        markedAt: json.asOf,
        confirmedOnRti: json.ok && !json.mocked,
        mocked: json.mocked,
        source: json.source,
      };
      writeStretchPick(pick);
      setStretch({
        ...stretch,
        pick,
        enrollingId: null,
        note: json.note ?? stretch.note,
        error: json.ok ? null : json.error ?? json.note ?? "Enrollment failed",
        source: json.source,
      });
    } catch (err) {
      setStretch({
        ...stretch,
        enrollingId: null,
        error: err instanceof Error ? err.message : "Enrollment failed",
      });
    }
  }

  function resetPick() {
    if (!stretch) return;
    clearStretchPick(stretch.dateKey);
    setStretch({
      ...stretch,
      pick: null,
      error: null,
      note: stretch.note,
    });
  }

  const conditionClass = CONDITION_CLASS[weather.condition] ?? styles.condClear;
  const weatherOffline = weather.source === "fallback";
  const tempLabel =
    typeof weather.temperatureF === "number"
      ? `${Math.round(weather.temperatureF)}°`
      : null;
  const weatherDetail = weatherOffline
    ? "Midway · weather offline"
    : `${weather.summary} in ${weather.place}`;

  return (
    <div className={`${styles.shell} ${conditionClass}`}>
      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.skyWash} />
        <div className={styles.skyGlow} />
        <div className={styles.orb} />
        <div className={styles.cloudFar} />
        <div className={styles.cloudBank} />
        <div className={styles.precip} />
        <div className={styles.horizon} />
        <div className={styles.haze} />
        <div className={styles.grain} />
        <div className={styles.readability} />
      </div>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.brand}>Firstlight</p>
          <h1 className={styles.headline}>
            {greeting}.
            <span className={styles.headlineDate}> {dateLabel}</span>
          </h1>
          <p
            className={styles.weatherLine}
            aria-live="polite"
            title={weather.line ?? undefined}
          >
            {tempLabel ? (
              <span className={styles.weatherTemp}>{tempLabel}</span>
            ) : null}
            <span className={styles.weatherDetail}>{weatherDetail}</span>
          </p>
          <p className={styles.lede}>
            Missing work, today’s calendar, and stretch options.
          </p>
        </div>
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

        {stretch ? (
          <section className={styles.section} aria-labelledby="stretch-heading">
            <div className={styles.sectionHead}>
              <h2 id="stretch-heading">Stretch</h2>
              <div className={styles.badgeRow}>
                <span className={styles.badgeStretch}>Mon / Wed</span>
                {stretch.source ? (
                  <span
                    className={
                      stretch.source === "sample"
                        ? styles.badgeSample
                        : styles.badgeLive
                    }
                  >
                    {stretch.source === "sample" ? "Sample data" : "Live RTI"}
                  </span>
                ) : (
                  <span className={styles.badgeMuted}>Loading…</span>
                )}
              </div>
            </div>
            <p className={styles.note}>
              Tap a session to enroll via school-timeline on{" "}
              <a href={stretch.loginUrl} target="_blank" rel="noreferrer">
                RTI Scheduler
              </a>
              . On Mon/Wed, if nothing is picked by {stretch.deadlineHour}:00 AM
              Denver, we auto-enroll PE Stretch.
            </p>
            {stretch.credentialMode === "none" ? (
              <p className={styles.note}>
                Live enroll needs a one-time Mac SSO cookie setup (SESSION +
                XSRF). Until then, taps use sample/mock enrollment.
              </p>
            ) : null}
            {stretch.note ? <p className={styles.note}>{stretch.note}</p> : null}
            {stretch.error ? <p className={styles.error}>{stretch.error}</p> : null}

            {stretch.pick ? (
              <div className={styles.stretchResult}>
                <p className={styles.stretchPick}>
                  {stretch.pick.autoSelected ? "Auto-selected: " : "Enrolled: "}
                  <strong>{stretch.pick.sessionName}</strong>
                </p>
                <p className={styles.note}>
                  {stretch.pick.confirmedOnRti
                    ? "Confirmed on RTI Scheduler (school-timeline)."
                    : stretch.pick.mocked
                      ? "Mock only — add RTI SESSION + XSRF secrets for real enroll."
                      : "Saved here — RTI still needs a fresh SESSION/XSRF cookie."}
                </p>
                <div className={styles.actions}>
                  <a
                    className={styles.btnPrimary}
                    href={stretch.loginUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open school timeline
                  </a>
                  <button type="button" className={styles.btnGhost} onClick={resetPick}>
                    Choose again
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.stretchFlow}>
                <ul className={styles.optionList}>
                  {stretch.sessions.map((session, i) => (
                    <li key={session.sessionId} style={{ animationDelay: `${0.04 * i}s` }}>
                      <button
                        type="button"
                        className={styles.optionButton}
                        disabled={Boolean(stretch.enrollingId)}
                        onClick={() =>
                          void enrollOption(session.sessionId, session.name)
                        }
                      >
                        <span className={styles.optionMain}>
                          <span className={styles.optionTitle}>{session.name}</span>
                          <span className={styles.optionMeta}>
                            {[session.instructor, session.department, session.courseName]
                              .filter(Boolean)
                              .join(" · ") || "Open session"}
                          </span>
                        </span>
                        <span className={styles.optionAside}>
                          {stretch.enrollingId === session.sessionId
                            ? "Enrolling…"
                            : session.seatsLabel ??
                              (stretch.credentialMode === "none"
                                ? "Mock enroll"
                                : session.isPeStretch
                                  ? "Default"
                                  : "Enroll")}
                        </span>
                      </button>
                    </li>
                  ))}
                  {stretch.sessions.length === 0 ? (
                    <li className={styles.empty}>No open stretch sessions yet.</li>
                  ) : null}
                </ul>
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
