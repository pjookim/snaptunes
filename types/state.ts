import { SongInfo } from './song'
import { SpotifyTrack } from '@/app/spotify-api'

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
