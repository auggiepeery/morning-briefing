import { fetchCurrentWeather } from "@/lib/weather/client";

export async function GET() {
  const payload = await fetchCurrentWeather();
  return Response.json(payload, {
    headers: { "cache-control": "private, no-store" },
  });
}
