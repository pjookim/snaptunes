// Apple Music API 연동

import { SongInfo } from "./ocr";

export interface AppleMusicSong {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
}

export async function searchSongsInAppleMusic(songs: SongInfo[], userToken: string): Promise<AppleMusicSong[]> {
  // TODO: Apple Music API로 곡 검색 구현
  return songs.map(song => ({ 
    id: `PLACEHOLDER_ID_${song.title}`, 
    title: song.title, 
    artist: song.artist 
  }));
}

export async function createAppleMusicPlaylist(songs: AppleMusicSong[], userToken: string): Promise<string> {
  // TODO: Apple Music API로 플레이리스트 생성 및 곡 추가 구현
  return "https://music.apple.com/playlist/PLACEHOLDER";
} 