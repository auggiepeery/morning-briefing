import { fetchMissingAssignments } from "@/lib/canvas/client";
import { ownerLiveIntegrationsAllowed } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const allowLive = await ownerLiveIntegrationsAllowed(request);
  const payload = await fetchMissingAssignments({ allowLive });
  return Response.json(payload, {
    headers: { "cache-control": "private, no-store" },
  });
}
