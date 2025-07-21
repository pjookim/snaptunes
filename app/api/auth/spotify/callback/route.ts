import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET!
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const data = await res.json();

  if (!data.access_token) {
    return NextResponse.json({ error: "Failed to get access token", detail: data }, { status: 400 });
  }

  // access_token, refresh_token, expires_in 등 반환
  // 실제 서비스에서는 세션/쿠키에 저장하거나, 클라이언트로 리다이렉트 후 쿼리로 전달
  // 여기서는 쿼리로 리다이렉트 예시
  const redirectUrl = new URL("/", req.nextUrl.origin);
  redirectUrl.searchParams.set("spotify_access_token", data.access_token);
  redirectUrl.searchParams.set("spotify_refresh_token", data.refresh_token ?? "");
  return NextResponse.redirect(redirectUrl.toString());
} 