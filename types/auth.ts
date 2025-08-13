export type Platform = 'spotify' | 'apple-music' | 'youtube-music'

export interface SpotifyUser {
  id: string
  displayName: string
  email: string
  imageUrl?: string
}

export interface YouTubeUser {
  id: string
  displayName: string
  imageUrl?: string
}

export interface AppleMusicUser {
  id?: string
  displayName: string
  email?: string
  imageUrl?: string
  hasAppleMusicSubscription?: boolean
  libraryPlaylistsCount?: number
}

export interface Step1AuthCardProps {
  t: (key: string) => string
  selectedPlatform: Platform | null
  onPlatformSelect: (p: Platform | null) => void

  // Spotify
  spotifyToken: string | null
  spotifyUser: SpotifyUser | null
  onSpotifyAuth: () => void
  onSpotifyLogout: () => void

  // Apple Music
  isAppleAuthorized: boolean
  appleMusicUser: AppleMusicUser | null
  onAppleAuthorize: () => void
  onAppleUnauthorize: () => void

  // YouTube Music
  youtubeToken: string | null
  youtubeUser: YouTubeUser | null
  onYouTubeAuth: () => void
  onYouTubeLogout: () => void

  goToStep: (step: number) => void
}
