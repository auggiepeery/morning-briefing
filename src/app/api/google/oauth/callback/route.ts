export async function GET() {
  return new Response("Google OAuth disabled in public build.", {
    status: 410,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
