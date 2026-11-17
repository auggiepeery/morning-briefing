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

Without tokens, the UI shows clearly labeled **sample data**.

Do not put secrets in `NEXT_PUBLIC_` / client env.

## Dev

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Preview stretch UI any day with `?stretch`.

## Stretch (rtischeduler.com)

Mon/Wed mornings: guided pick via school SSO on RTI Scheduler. Local pick state in `localStorage`. If nothing is picked by **8:00 AM America/Denver**, the app auto-selects **PE Stretch** (local reminder — confirm on RTI; no remote enrollment without school credentials).
