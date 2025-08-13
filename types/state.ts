import { SongInfo } from './song'
import { SpotifyTrack } from '@/app/spotify-api'

// 플랫폼 타입 상수화
export const PLATFORMS = {
  SPOTIFY: 'spotify',
  APPLE_MUSIC: 'apple-music',
  YOUTUBE_MUSIC: 'youtube-music',
} as const

export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS]

type SavedState = {
  step: number
  text: string
  ocrResult: SongInfo[]
  spotifyTracks: SpotifyTrack[]
  selectedTrackIds: string[]
  playlistName: string
  isExtracted: boolean
  isSearched: boolean
  spotifyUser: {
    id: string
    displayName: string
    email: string
    imageUrl?: string
  } | null
  timestamp: number
}

export default SavedState
