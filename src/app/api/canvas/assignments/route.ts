import { fetchMissingAssignments } from "@/lib/canvas/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await fetchMissingAssignments();
  return Response.json(payload, {
    headers: { "cache-control": "private, no-store" },
  });
}
