import { exchangeCodeForTokens, resolveRedirectUri } from "@/lib/google/oauth";


function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Completes the OAuth code exchange server-side.
 * Refresh tokens are never sent to the browser — the HTML page tells the
 * operator to store GOOGLE_REFRESH_TOKEN via Cursor app secrets.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const expected = readCookie(request, "gcal_oauth_state");

  if (error) {
    return htmlPage("Google OAuth error", `<p>${escapeHtml(error)}</p><p><a href="/">Back</a></p>`);
  }

  if (!code || !state || !expected || state !== expected) {
    return htmlPage(
      "Invalid OAuth state",
      `<p>Start again from <a href="/api/google/oauth/start">Connect Google Calendar</a>.</p>`,
    );
  }

  try {
    const redirectUri = resolveRedirectUri(request.url);
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (tokens.error || !tokens.refresh_token) {
      const detail =
        tokens.error_description ||
        tokens.error ||
        "No refresh_token returned. Revoke prior access and retry with prompt=consent.";
      return htmlPage("Token exchange incomplete", `<p>${escapeHtml(detail)}</p>`);
    }

    // Never echo or log the refresh token. Operator stores GOOGLE_REFRESH_TOKEN
    // via Cursor Apps Secrets (e.g. from Google Cloud OAuth / Playground offline access).
    void tokens.refresh_token;
    return htmlPage(
      "Google Calendar authorization ok",
      `<p>Consent completed. Ensure <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and <code>GOOGLE_REFRESH_TOKEN</code> are set in Cursor Apps Secrets so live events can load.</p>
       <p>This page never displays tokens.</p>
       <p><a href="/">Return to Firstlight</a></p>`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return htmlPage("OAuth failed", `<p>${escapeHtml(message)}</p>`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlPage(title: string, body: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
  <style>body{font-family:Georgia,serif;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.5;color:#1c2430;background:#f3ebe0}code{background:#fff6;padding:.1rem .35rem;border-radius:4px}</style>
  </head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "Set-Cookie": "gcal_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}
