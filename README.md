# Firstlight — Morning Briefing

Personal morning briefing for America/Denver: greeting, live Midway weather hero, Canvas missing work, Google Calendar, and Mon/Wed stretch (RTI Scheduler).

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
| `RTI_STUDENT_SELF_ENROLL_KEY` | Student key from the RTI “Choose a Session” email link |
| `RTI_SCHEDULE_SELF_ENROLLMENT_KEY` | Schedule key from that same email link |
| `RTI_SESSION_COOKIE` | Optional alternate: `SESSION` cookie after school Google/Microsoft SSO |
| `RTI_STUDENT_ID` | Required with session cookie mode |
| `RTI_SESSION_SCHEDULE_ID` | Required with session cookie mode |
| `RTI_XSRF_TOKEN` | Optional XSRF token for cookie-mode POSTs |

Without tokens, the UI shows clearly labeled **sample data**.

Do not put secrets in `NEXT_PUBLIC_` / client env. Never paste RTI credentials into chat.

## Dev

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Preview stretch UI any day with `?stretch`.

## Stretch (rtischeduler.com)

Visible **Monday and Wednesday** (America/Denver), or any day with `?stretch`.

1. `GET /api/stretch/sessions` lists open sessions from RTI when credentials are set (otherwise sample options).
2. Tapping a session calls `POST /api/stretch/enroll`, which POSTs the real RTI self-enrollment endpoint server-side.
3. Preferred auth: email deep-link keys (`RTI_STUDENT_SELF_ENROLL_KEY` + `RTI_SCHEDULE_SELF_ENROLLMENT_KEY`) — no school password stored.
4. Fallback auth: school `SESSION` cookie + student/schedule ids (SSO still required to mint the cookie).
5. If nothing is picked by **8:00 AM America/Denver** on Mon/Wed, the server auto-enrolls **PE Stretch** (mock when secrets unset).

Discovered RTI routes (from the public SPA):

- `GET /self-enrollment-api/operations/self-enrollment/student/{studentKey}/schedule/{scheduleKey}`
- `POST /self-enrollment-api/operations/self-enrollment/student/{studentKey}/session/{sessionId}`
