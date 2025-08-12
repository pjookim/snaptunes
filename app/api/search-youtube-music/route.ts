import { NextRequest, NextResponse } from 'next/server'

// 곡 정보 타입 정의
interface Song {
  title: string
  artist: string
}

// YouTube Music 검색 API 응답 타입
interface YouTubeSearchItem {
  id: {
    videoId: string
  }
  snippet: {
    title: string
    channelTitle: string
    thumbnails: {
      default?: { url: string }
      medium?: { url: string }
      high?: { url: string }
    }
  }
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[]
}

export async function POST(req: NextRequest) {
  const { songs, accessToken }: { songs: Song[]; accessToken: string } =
    await req.json()
  if (!Array.isArray(songs) || !accessToken) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  const results = []
  for (const song of songs) {
    // 정식 음원 우선 검색: 공식 아티스트 채널, Topic 채널, 뮤직비디오 우선
    const query = encodeURIComponent(`${song.title} ${song.artist}`.trim())
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=${query}&maxResults=5&videoEmbeddable=true&videoSyndicated=true&key=${process.env.YOUTUBE_API_KEY}`

    const res = await fetch(url, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!res.ok) {
      results.push({ ...song, found: false })
      continue
    }

    const data: YouTubeSearchResponse = await res.json()

    // 정식 음원 후보 우선순위 필터링
    const items = data.items || []
    const scored = items.map((it) => {
      const title = (it.snippet?.title || '').toLowerCase()
      const channel = (it.snippet?.channelTitle || '').toLowerCase()
      let score = 0
      // 공식 아티스트 채널 또는 Topic 채널 가점
      if (channel.includes(' - topic') || channel.includes('official')) score += 3
      // 제목에 "official", "audio", "lyric", "mv" 등의 키워드 가점/감점
      if (title.includes('official')) score += 2
      if (title.includes('audio')) score += 2
      if (title.includes('mv') || title.includes('music video')) score += 1
      if (title.includes('live') || title.includes('cover')) score -= 2
      // 아티스트명/제목 일치 가점
      if (title.includes(song.title.toLowerCase())) score += 2
      if (channel.includes(song.artist.toLowerCase())) score += 2
      return { it, score }
    })
    scored.sort((a, b) => b.score - a.score)
    const best = scored[0]?.it

    if (best && best.id?.videoId) {
      const thumbnailUrl = best.snippet.thumbnails?.medium?.url || 
                          best.snippet.thumbnails?.default?.url

      results.push({
        id: best.id.videoId,
        title: best.snippet.title,
        artist: best.snippet.channelTitle,
        albumArt: thumbnailUrl,
        found: true,
      })
    } else {
      results.push({ ...song, found: false })
    }
  }

  return NextResponse.json({ results })
} 