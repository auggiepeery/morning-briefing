export async function GET() {
  return Response.json(
    { ready: false, oauthDisabled: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}
