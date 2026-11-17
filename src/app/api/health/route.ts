import { DEFAULT_CANVAS_BASE_URL, DEFAULT_CANVAS_HINT } from "@/lib/canvas/config";


export async function GET() {
  return Response.json({
    ok: true,
    app: "firstlight-morning-briefing",
    timezone: "America/Denver",
    canvas: {
      effectiveBaseUrl:
        process.env.CANVAS_BASE_URL?.trim() || DEFAULT_CANVAS_BASE_URL,
      baseUrlOverridden: Boolean(process.env.CANVAS_BASE_URL?.trim()),
      tokenSet: Boolean(process.env.CANVAS_ACCESS_TOKEN?.trim()),
      hint: DEFAULT_CANVAS_HINT,
    },
    google: {
      clientIdSet: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
      clientSecretSet: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
      refreshTokenSet: Boolean(process.env.GOOGLE_REFRESH_TOKEN?.trim()),
    },
  });
}
