import { enrollStretchOption } from "@/lib/rti/client";
import { ownerLiveIntegrationsAllowed } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

type EnrollBody = {
  sessionId?: string;
  sessionName?: string;
  autoSelected?: boolean;
};

export async function POST(request: Request) {
  let body: EnrollBody = {};
  try {
    body = (await request.json()) as EnrollBody;
  } catch {
    body = {};
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return Response.json(
      {
        ok: false,
        error: "sessionId is required",
      },
      { status: 400 },
    );
  }

  const allowLive = await ownerLiveIntegrationsAllowed(request);
  const result = await enrollStretchOption(sessionId, {
    sessionName: body.sessionName?.trim(),
    autoSelected: Boolean(body.autoSelected),
    allowLive,
  });

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
