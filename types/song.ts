export interface SongInfo {
  title: string
  artist: string
}

export interface APIResponse {
  songs?: SongInfo[]
  playlist_title?: string
  error?: string
}
