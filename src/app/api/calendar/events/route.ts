import { fetchTodaysEvents } from "@/lib/google/client";
import { ownerLiveIntegrationsAllowed } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const allowLive = await ownerLiveIntegrationsAllowed(request);
  const payload = await fetchTodaysEvents({ allowLive });
  return Response.json(payload, {
    headers: { "cache-control": "private, no-store" },
  });
}
