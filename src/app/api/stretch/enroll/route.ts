import { enrollStretchOption } from "@/lib/rti/client";

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

  const result = await enrollStretchOption(sessionId, {
    sessionName: body.sessionName?.trim(),
    autoSelected: Boolean(body.autoSelected),
  });

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
