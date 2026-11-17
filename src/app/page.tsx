import { Suspense } from "react";
import { MorningBrief } from "@/components/MorningBrief";
import { fetchCurrentWeather } from "@/lib/weather/client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const weather = await fetchCurrentWeather();

  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh" }} />}>
      <MorningBrief initialWeather={weather} />
    </Suspense>
  );
}
