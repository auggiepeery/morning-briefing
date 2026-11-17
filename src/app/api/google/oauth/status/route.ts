import { ownerLiveIntegrationsAllowed } from "@/lib/owner-auth";
import { oauthConfigured } from "@/lib/google/client";
import { googleOAuthReady } from "@/lib/google/oauth";

export async function GET(request: Request) {
  if (!(await ownerLiveIntegrationsAllowed(request))) {
    return Response.json(
      { ready: false, ownerRequired: true },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  return Response.json(
    {
      clientConfigured: googleOAuthReady(),
      refreshConfigured: Boolean(process.env.GOOGLE_REFRESH_TOKEN?.trim()),
      ready: oauthConfigured(),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
