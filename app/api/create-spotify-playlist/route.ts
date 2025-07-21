import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { accessToken, tracks, playlistName } = await req.json();
  if (!accessToken || !Array.isArray(tracks) || !playlistName) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  // 1. 사용자 정보 조회 (user id 필요)
  const userRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const user = await userRes.json();
  if (!user.id) {
    return NextResponse.json({ error: "사용자 정보 조회 실패" }, { status: 400 });
  }

  // 2. 플레이리스트 생성
  const playlistRes = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: playlistName,
      public: false,
      description: "SnapTunes로 생성된 플레이리스트"
    })
  });
  const playlist = await playlistRes.json();
  if (!playlist.id) {
    return NextResponse.json({ error: "플레이리스트 생성 실패" }, { status: 400 });
  }

  // 3. 트랙 추가
  const uris = tracks.map((id: string) => `spotify:track:${id}`);
  await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ uris })
  });

  return NextResponse.json({ playlistUrl: playlist.external_urls.spotify });
} 