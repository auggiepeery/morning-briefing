import { fetchMissingAssignments } from "@/lib/canvas/client";


export async function GET() {
  const payload = await fetchMissingAssignments();
  return Response.json(payload, {
    headers: { "cache-control": "private, no-store" },
  });
}
