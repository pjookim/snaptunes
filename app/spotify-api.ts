import { SongInfo } from "./ocr";

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
  found?: boolean;
}

export async function searchSongsInSpotify(songs: SongInfo[], accessToken: string): Promise<SpotifyTrack[]> {
  const res = await fetch("/api/search-spotify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songs, accessToken })
  });
  const data = await res.json();
  return data.results ?? [];
}

export async function createSpotifyPlaylist(tracks: string[], accessToken: string, playlistName: string): Promise<string | null> {
  const res = await fetch("/api/create-spotify-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tracks, accessToken, playlistName })
  });
  const data = await res.json();
  return data.playlistUrl ?? null;
} 