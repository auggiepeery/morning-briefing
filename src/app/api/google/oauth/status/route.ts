import { oauthConfigured } from "@/lib/google/client";
import { googleOAuthReady } from "@/lib/google/oauth";


export async function GET() {
  return Response.json(
    {
      clientConfigured: googleOAuthReady(),
      refreshConfigured: Boolean(process.env.GOOGLE_REFRESH_TOKEN?.trim()),
      ready: oauthConfigured(),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
