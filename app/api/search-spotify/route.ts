import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { songs, accessToken } = await req.json();
  if (!Array.isArray(songs) || !accessToken) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const results = [];
  for (const song of songs) {
    const q = encodeURIComponent(`${song.title} ${song.artist}`.trim());
    const url = `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      results.push({ ...song, found: false });
      continue;
    }

    const data = await res.json();
    const foundTrack = data.tracks?.items?.[0];
    if (foundTrack) {
      results.push({
        id: foundTrack.id,
        title: foundTrack.name,
        artist: foundTrack.artists.map((a: any) => a.name).join(", "),
        albumArt: foundTrack.album.images?.[0]?.url,
        found: true
      });
    } else {
      results.push({ ...song, found: false });
    }
  }

  return NextResponse.json({ results });
} 