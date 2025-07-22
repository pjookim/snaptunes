import { NextRequest, NextResponse } from "next/server";

// 곡 정보 타입 정의
interface Song {
  title: string;
  artist: string;
}

// Spotify 트랙 아티스트 타입
interface SpotifyArtist {
  name: string;
}

// Spotify 트랙 앨범 이미지 타입
interface SpotifyImage {
  url: string;
}

// Spotify 트랙 타입
interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: {
    images: SpotifyImage[];
  };
}

// Spotify Search API 응답 타입
interface SpotifySearchResponse {
  tracks?: {
    items?: SpotifyTrack[];
  };
}

export async function POST(req: NextRequest) {
  const { songs, accessToken }: { songs: Song[]; accessToken: string } = await req.json();
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

    const data: SpotifySearchResponse = await res.json();
    const foundTrack = data.tracks?.items?.[0];
    if (foundTrack) {
      results.push({
        id: foundTrack.id,
        title: foundTrack.name,
        artist: foundTrack.artists.map((a) => a.name).join(", "),
        albumArt: foundTrack.album.images?.[0]?.url,
        found: true
      });
    } else {
      results.push({ ...song, found: false });
    }
  }

  return NextResponse.json({ results });
} 