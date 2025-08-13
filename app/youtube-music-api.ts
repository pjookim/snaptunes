import { SongInfo } from '@/types/song'

export interface YouTubeMusicTrack {
  id: string
  title: string
  artist: string
  albumArt?: string
  found?: boolean
}

export async function searchSongsInYouTubeMusic(
  songs: SongInfo[],
  accessToken: string,
): Promise<YouTubeMusicTrack[]> {
  const res = await fetch('/api/search-youtube-music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songs, accessToken }),
  })
  const data = await res.json()
  return data.results ?? []
}

export interface CreatedPlaylistInfo {
  playlistUrl: string | null
  cover: string | null
  name: string
  ownerName: string
  ownerUrl: string | null
}

export async function createYouTubeMusicPlaylist(
  tracks: string[],
  accessToken: string,
  playlistName: string,
): Promise<CreatedPlaylistInfo | null> {
  const res = await fetch('/api/create-youtube-music-playlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracks, accessToken, playlistName }),
  })
  const data = await res.json()
  if (!data.playlistUrl) return null
  return {
    playlistUrl: data.playlistUrl,
    cover: data.cover || null,
    name: data.name || '',
    ownerName: data.ownerName || '',
    ownerUrl: data.ownerUrl || null,
  }
}
