/** Public-safe: Google OAuth connect helpers are not shipped. */

export function googleOAuthReady(): boolean {
  return false;
}

export function buildAuthorizeUrl(_redirectUri: string, _state: string): string {
  throw new Error("Google OAuth is disabled in this public build");
}

export async function exchangeCodeForTokens(
  _code: string,
  _redirectUri: string,
): Promise<never> {
  throw new Error("Google OAuth is disabled in this public build");
}

export function resolveRedirectUri(requestUrl: string): string {
  const origin = new URL(requestUrl).origin;
  return `${origin}/api/google/oauth/callback`;
}
