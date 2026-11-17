import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "oauth_disabled", message: "Google OAuth disabled in public build." },
    { status: 410 },
  );
}
