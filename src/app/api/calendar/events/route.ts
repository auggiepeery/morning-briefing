import { fetchTodaysEvents } from "@/lib/google/client";


export async function GET() {
  const payload = await fetchTodaysEvents();
  return Response.json(payload, {
    headers: { "cache-control": "private, no-store" },
  });
}
