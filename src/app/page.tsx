import { Suspense } from "react";
import { MorningBrief } from "@/components/MorningBrief";

export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh" }} />}>
      <MorningBrief />
    </Suspense>
  );
}
