import { buildAuthorizeUrl, googleOAuthReady, resolveRedirectUri } from "@/lib/google/oauth";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
  if (!googleOAuthReady()) {
    return NextResponse.json(
      {
        error: "oauth_not_configured",
        message:
          "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then retry. Refresh token goes in GOOGLE_REFRESH_TOKEN after consent.",
      },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = resolveRedirectUri(request.url);
  const url = buildAuthorizeUrl(redirectUri, state);

  const response = NextResponse.redirect(url, 302);
  response.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
