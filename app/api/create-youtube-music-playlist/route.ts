import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { accessToken, tracks, playlistName } = await req.json()
  if (!accessToken || !Array.isArray(tracks) || !playlistName) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  try {
    // 1. 사용자의 채널 정보 가져오기
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!channelRes.ok) {
      return NextResponse.json(
        { error: '사용자 정보 조회 실패' },
        { status: 400 },
      )
    }

    const channelData = await channelRes.json()
    const channel = channelData.items?.[0]

    if (!channel) {
      return NextResponse.json(
        { error: '사용자 채널을 찾을 수 없습니다' },
        { status: 400 },
      )
    }

    // 2. 플레이리스트 생성
    const playlistRes = await fetch(
      'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            title: playlistName,
            description: 'SnapTunes로 생성된 플레이리스트',
            defaultLanguage: 'ko',
          },
          status: {
            privacyStatus: 'private',
          },
        }),
      },
    )

    if (!playlistRes.ok) {
      const errorData = await playlistRes.json()
      console.error('Playlist creation error:', errorData)
      return NextResponse.json(
        { error: '플레이리스트 생성 실패' },
        { status: 400 },
      )
    }

    const playlist = await playlistRes.json()
    const playlistId = playlist.id

    if (!playlistId) {
      return NextResponse.json(
        { error: '플레이리스트 ID를 찾을 수 없습니다' },
        { status: 400 },
      )
    }

    // 3. 비디오들을 플레이리스트에 추가
    for (const videoId of tracks) {
      try {
        await fetch(
          'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                playlistId: playlistId,
                resourceId: {
                  kind: 'youtube#video',
                  videoId: videoId,
                },
              },
            }),
          },
        )
      } catch (error) {
        console.error(`Failed to add video ${videoId} to playlist:`, error)
        // 개별 비디오 추가 실패는 무시하고 계속 진행
      }
    }

    // 4. 플레이리스트 URL 생성
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`

    // 5. 플레이리스트 썸네일 가져오기 (첫 번째 비디오의 썸네일 사용)
    let thumbnailUrl = null
    if (tracks.length > 0) {
      try {
        const videoRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${tracks[0]}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )
        if (videoRes.ok) {
          const videoData = await videoRes.json()
          const video = videoData.items?.[0]
          if (video) {
            thumbnailUrl =
              video.snippet.thumbnails?.medium?.url ||
              video.snippet.thumbnails?.default?.url
          }
        }
      } catch (error) {
        console.error('Failed to get video thumbnail:', error)
      }
    }

    return NextResponse.json({
      playlistUrl,
      cover: thumbnailUrl,
      name: playlistName,
      ownerName: channel.snippet?.title || 'YouTube Music User',
      ownerUrl: `https://www.youtube.com/channel/${channel.id}`,
    })
  } catch (error) {
    console.error('YouTube Music playlist creation error:', error)
    return NextResponse.json(
      { error: '플레이리스트 생성 중 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
