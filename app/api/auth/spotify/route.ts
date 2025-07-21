import { NextRequest, NextResponse } from "next/server";

const SCOPE = [
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-email",
  "user-read-private"
].join(" ");

export async function GET() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: SCOPE,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    show_dialog: "true"
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
} 