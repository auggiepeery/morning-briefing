# Firstlight — Morning Briefing

Personal morning briefing for America/Denver: greeting, live Midway weather hero, Canvas missing work, Google Calendar, and Mon/Wed stretch (RTI Scheduler school-timeline).

## Stack

Next.js App Router + TypeScript. Secrets stay server-side (`process.env`); the browser only calls `/api/*`. Midway weather is fetched server-side from Open-Meteo (no API key).

## Secrets

| Name | Purpose |
|------|---------|
| `CANVAS_BASE_URL` | Optional override. Defaults to `https://wasatch.instructure.com` |
| `CANVAS_ACCESS_TOKEN` | Canvas LMS API token (live missing work) |
| `GOOGLE_CLIENT_ID` | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Offline refresh token for Calendar read |
| `GOOGLE_REDIRECT_URI` | Optional OAuth callback override |
| `RTI_BASE_URL` | Optional. Defaults to `https://www.rtischeduler.com` |
| `RTI_SESSION_COOKIE` | **Preferred.** Value of the `SESSION` cookie after school Google/Microsoft SSO on school-timeline |
| `RTI_XSRF_TOKEN` | **Required with SESSION for enroll POSTs.** Value of `XSRF-TOKEN-PROD` |
| `RTI_STUDENT_ID` | Optional if SESSION can call `/user/entities`; otherwise set from timeline |
| `RTI_SCHOOL_ID` | Optional; enables `/ui/school-timeline/{id}` links + schedule auto-discovery |
| `RTI_SESSION_SCHEDULE_ID` | Optional; pin a schedule. If unset, Firstlight discovers today’s schedule |
| `RTI_STUDENT_SELF_ENROLL_KEY` | Legacy only (email deep-link). Ignored when `RTI_SESSION_COOKIE` is set |
| `RTI_SCHEDULE_SELF_ENROLLMENT_KEY` | Legacy only (email deep-link). Ignored when `RTI_SESSION_COOKIE` is set |

Without RTI secrets, the UI shows clearly labeled **sample data** and mock enroll.

Do not put secrets in `NEXT_PUBLIC_` / client env. Never paste RTI cookie values into chat.

### One-time Mac setup (school-timeline SESSION)

iPhone Safari cannot show HttpOnly cookies. Do this once on a Mac (or any desktop browser), then paste into app secrets:

1. Open [https://www.rtischeduler.com/choose-login](https://www.rtischeduler.com/choose-login) in Chrome/Safari.
2. Sign in with **school Google/Microsoft** SSO (same account as stretch).
3. Confirm you land on **school timeline** (`/ui/school-timeline/...`).
4. DevTools → Application/Storage → Cookies → `https://www.rtischeduler.com`:
   - Copy **`SESSION`** → `RTI_SESSION_COOKIE`
   - Copy **`XSRF-TOKEN-PROD`** → `RTI_XSRF_TOKEN`
5. Optional but helpful (Network tab while opening a stretch day):
   - `RTI_STUDENT_ID` from `/user/entities` or self-enrollment URL
   - `RTI_SCHOOL_ID` from the timeline URL
   - `RTI_SESSION_SCHEDULE_ID` from the logged-in self-enrollment request (or leave unset for auto-discovery)
6. Refresh cookies when enroll starts returning 401/403 (SSO sessions expire).

**iPhone-only path:** not possible for server-side enroll. The `SESSION` cookie is HttpOnly; iOS has no practical way to export it into Firstlight secrets. Use the Mac steps above, or open RTI manually on the phone.

## Dev

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Stretch options are always visible.

## Stretch (school-timeline → real enroll)

Options UI is always shown. PE auto-enroll still runs only on **Monday and Wednesday** after **8:00 AM America/Denver**.

1. `GET /api/stretch/sessions` lists open sessions from RTI when SESSION secrets are set (otherwise sample).
2. Tap → `POST /api/stretch/enroll` → server POSTs the **logged-in** school-timeline endpoint.
3. Preferred auth: `RTI_SESSION_COOKIE` + `RTI_XSRF_TOKEN` (school SSO). Student/schedule ids are optional when discovery works.
4. Legacy fallback (only if SESSION unset): email deep-link keys — not needed if you never get “Choose a Session” email.
5. After 8:00 AM Denver on Mon/Wed with no pick, auto-enroll **PE Stretch** (mock when secrets unset).

School-timeline APIs (from the public SPA):

- `GET /user/entities` (student + school discovery after SSO)
- `GET /api/operations/schedule/school/{schoolId}/schedules-by-date-range?...&withSessionsForStudent={studentId}`
- `GET /self-enrollment-api/operations/self-enrollment/student/{studentId}/schedule/{scheduleId}/logged-in-self-enrollment`
- `POST /self-enrollment-api/operations/self-enrollment/student/{studentId}/session/{sessionId}/logged-in-self-enrollment`
