import { NextRequest, NextResponse } from 'next/server'

// 곡 정보 타입 정의
interface Song {
  title: string
  artist: string
}

// Apple Music 트랙 아티스트 타입
interface AppleMusicArtist {
  name: string
}

// Apple Music 트랙 아트워크 타입
interface AppleMusicArtwork {
  url: string
  width: number
  height: number
}

// Apple Music 트랙 타입
interface AppleMusicTrack {
  id: string
  type: string
  attributes: {
    name: string
    artistName: string
    artwork: AppleMusicArtwork
  }
}

// Apple Music Search API 응답 타입
interface AppleMusicSearchResponse {
  results: {
    songs?: {
      data: AppleMusicTrack[]
    }
  }
}

export async function POST(req: NextRequest) {
  const { songs, accessToken }: { songs: Song[]; accessToken: string } =
    await req.json()
  if (!Array.isArray(songs) || !accessToken) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  // Apple Music Developer Token을 한 번만 가져오기 (성능 최적화)
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
    console.log('Developer Token fetched successfully')
  } catch (error) {
    console.error('Developer Token fetch error:', error)
    return NextResponse.json(
      { error: 'Apple Music Developer Token을 가져올 수 없습니다' },
      { status: 500 },
    )
  }

  const results = []
  const totalSongs = songs.length

  console.log(`Starting Apple Music search for ${totalSongs} songs...`)

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i]
    const currentProgress = i + 1

    try {
      // 진행률 로깅 (프론트엔드에서 이 정보를 사용할 수 있도록)
      console.log(
        `[${currentProgress}/${totalSongs}] Searching for: ${song.title} - ${song.artist}`,
      )

      const term = encodeURIComponent(`${song.title} ${song.artist}`.trim())
      const url = `https://api.music.apple.com/v1/catalog/us/search?term=${term}&types=songs&limit=1`

      // 올바른 토큰 사용:
      // - Developer Token: Authorization 헤더에 사용
      // - User Token: Music-User-Token 헤더에 사용 (사용자별 콘텐츠 접근용)
      const headers: Record<string, string> = {
        Authorization: `Bearer ${developerToken}`,
        'Content-Type': 'application/json',
      }

      // User Token이 있으면 Music-User-Token 헤더에 추가
      if (accessToken && accessToken !== 'authorized') {
        headers['Music-User-Token'] = accessToken
      }

      const startTime = Date.now()
      const res = await fetch(url, { headers })
      const searchTime = Date.now() - startTime

      if (!res.ok) {
        console.error(
          `[${currentProgress}/${totalSongs}] Search failed for "${song.title}":`,
          res.status,
          res.statusText,
          `(${searchTime}ms)`,
        )
        const errorText = await res.text()
        console.error('Error response:', errorText)
        results.push({ ...song, found: false })
        continue
      }

      const data: AppleMusicSearchResponse = await res.json()
      const foundTrack = data.results.songs?.data?.[0]

      if (foundTrack) {
        const artworkUrl = foundTrack.attributes.artwork?.url
        const formattedArtworkUrl = artworkUrl
          ? artworkUrl.replace('{w}', '300').replace('{h}', '300')
          : undefined

        const result = {
          id: foundTrack.id,
          title: foundTrack.attributes.name,
          artist: foundTrack.attributes.artistName,
          albumArt: formattedArtworkUrl,
          found: true,
        }

        console.log(
          `[${currentProgress}/${totalSongs}] Found track: ${result.title} - ${result.artist} (${searchTime}ms)`,
        )
        results.push(result)
      } else {
        console.log(
          `[${currentProgress}/${totalSongs}] No track found for: ${song.title} - ${song.artist} (${searchTime}ms)`,
        )
        results.push({ ...song, found: false })
      }
    } catch (error) {
      console.error(
        `[${currentProgress}/${totalSongs}] Error searching for "${song.title}":`,
        error,
      )
      results.push({ ...song, found: false })
    }
  }

  const foundCount = results.filter((r) => r.found).length
  console.log(
    `Apple Music search completed. Found ${foundCount}/${totalSongs} tracks`,
  )

  return NextResponse.json({
    results,
    summary: {
      total: totalSongs,
      found: foundCount,
      notFound: totalSongs - foundCount,
    },
  })
}
