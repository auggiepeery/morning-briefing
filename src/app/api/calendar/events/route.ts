import { fetchTodaysEvents } from "@/lib/google/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await fetchTodaysEvents();
  return Response.json(payload, {
    headers: { "cache-control": "private, no-store" },
  });
}
