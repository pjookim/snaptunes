import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { accessToken, tracks, playlistName } = await req.json()
  if (!accessToken || !Array.isArray(tracks) || !playlistName) {
    console.error('Invalid request data:', {
      accessToken: !!accessToken,
      tracks: tracks?.length,
      playlistName,
    })
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  try {
    // Apple Music Developer Token 가져오기
    let developerToken: string
    try {
      const devTokenRes = await fetch(
        `${req.nextUrl.origin}/api/auth/apple-music`,
      )
      if (!devTokenRes.ok) {
        throw new Error('Developer Token을 가져올 수 없습니다')
      }
      const devTokenData = await devTokenRes.json()
      developerToken = devTokenData.developerToken
      if (!developerToken) {
        throw new Error('Developer Token이 유효하지 않습니다')
      }
      console.log('Developer Token fetched successfully for playlist creation')
    } catch (error) {
      console.error('Developer Token fetch error:', error)
      return NextResponse.json(
        { error: 'Apple Music Developer Token을 가져올 수 없습니다' },
        { status: 500 },
      )
    }

    console.log('Creating Apple Music playlist:', {
      playlistName,
      tracksCount: tracks.length,
    })

    // Apple Music은 /v1/me 엔드포인트를 제공하지 않음
    // 대신 사용자 ID 없이 직접 플레이리스트 생성 시도
    console.log('Skipping user info fetch - Apple Music API limitation')

    // 1. 플레이리스트 생성 - Apple Music Library API 사용
    // Apple Music에서는 사용자 ID 없이도 플레이리스트 생성 가능
    const playlistRes = await fetch(
      `https://api.music.apple.com/v1/me/library/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${developerToken}`, // Developer Token 사용
          'Music-User-Token': accessToken, // User Token 사용
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributes: {
            name: playlistName,
            description: 'SnapTunes로 생성된 플레이리스트',
          },
          relationships: {
            tracks: {
              data: tracks.map((id: string) => ({
                id,
                type: 'songs',
              })),
            },
          },
        }),
      },
    )

    if (!playlistRes.ok) {
      const errorData = await playlistRes.text()
      console.error('Playlist creation failed:', playlistRes.status, errorData)
      return NextResponse.json(
        { error: `플레이리스트 생성 실패: ${playlistRes.status}` },
        { status: 400 },
      )
    }

    const playlist = await playlistRes.json()
    console.log('Playlist creation response:', playlist)

    const playlistId = playlist.data?.[0]?.id

    if (!playlistId) {
      console.error('No playlist ID found in response:', playlist)
      return NextResponse.json(
        { error: '플레이리스트 ID를 찾을 수 없습니다' },
        { status: 400 },
      )
    }

    console.log('Playlist created with ID:', playlistId)

    // 2. 플레이리스트 상세 정보 조회
    const playlistDetailRes = await fetch(
      `https://api.music.apple.com/v1/me/library/playlists/${playlistId}`,
      {
        headers: {
          Authorization: `Bearer ${developerToken}`, // Developer Token 사용
          'Music-User-Token': accessToken, // User Token 사용
        },
      },
    )

    if (!playlistDetailRes.ok) {
      const errorText = await playlistDetailRes.text()
      console.error(
        'Playlist detail fetch failed:',
        playlistDetailRes.status,
        errorText,
      )
      return NextResponse.json(
        {
          error: `플레이리스트 상세 정보 조회 실패: ${playlistDetailRes.status}`,
        },
        { status: 400 },
      )
    }

    const playlistDetail = await playlistDetailRes.json()
    console.log('Playlist detail response:', playlistDetail)

    const playlistData = playlistDetail.data?.[0]

    if (!playlistData) {
      console.error(
        'No playlist data found in detail response:',
        playlistDetail,
      )
      return NextResponse.json(
        { error: '플레이리스트 데이터를 찾을 수 없습니다' },
        { status: 400 },
      )
    }

    // Apple Music 플레이리스트 URL 생성
    const playlistUrl = `https://music.apple.com/playlist/${playlistId}`

    // 아트워크 URL 처리
    const artworkUrl = playlistData.attributes?.artwork?.url
    const formattedArtworkUrl = artworkUrl
      ? artworkUrl.replace('{w}', '300').replace('{h}', '300')
      : null

    const result = {
      playlistUrl,
      cover: formattedArtworkUrl,
      name: playlistData.attributes?.name || playlistName,
      ownerName: 'Apple Music User', // 사용자 정보를 가져올 수 없으므로 기본값 사용
      ownerUrl: null, // Apple Music은 개인 사용자 URL을 제공하지 않음
    }

    console.log('Playlist creation successful:', result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Apple Music playlist creation error:', error)
    return NextResponse.json(
      {
        error:
          '플레이리스트 생성 중 오류가 발생했습니다: ' +
          (error instanceof Error ? error.message : '알 수 없는 오류'),
      },
      { status: 500 },
    )
  }
}
