"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { extractSongTitlesFromText, SongInfo } from "./ocr";
import { searchSongsInSpotify, createSpotifyPlaylist, SpotifyTrack } from "./spotify-api";

function getAccessTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  return url.searchParams.get("spotify_access_token");
}

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [ocrResult, setOcrResult] = useState<SongInfo[]>([]);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState("SnapTunes Playlist");

  // 쿼리스트링에서 access_token 추출
  useEffect(() => {
    const token = getAccessTokenFromUrl();
    if (token) {
      setSpotifyToken(token);
      // URL에서 토큰 제거 (보안)
      const url = new URL(window.location.href);
      url.searchParams.delete("spotify_access_token");
      url.searchParams.delete("spotify_refresh_token");
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  // Spotify 인증 시작
  const handleSpotifyAuth = () => {
    window.location.href = "/api/auth/spotify";
  };

  // 이미지 업로드 핸들러 (미구현)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  // 곡명 추출
  const handleExtractSongs = async () => {
    if (!text.trim()) {
      setError("텍스트를 입력해주세요.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setOcrResult([]);
    setSpotifyTracks([]);
    setPlaylistUrl(null);
    setSelectedTrackIds([]);
    try {
      const songs = await extractSongTitlesFromText(text);
      setOcrResult(songs);
    } catch (error) {
      setError(error instanceof Error ? error.message : "곡명 추출에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // Spotify에서 곡 검색
  const handleSearchSpotify = async () => {
    if (!spotifyToken) {
      setError("Spotify 인증이 필요합니다.");
      return;
    }
    if (ocrResult.length === 0) {
      setError("추출된 곡명이 없습니다.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSpotifyTracks([]);
    setPlaylistUrl(null);
    setSelectedTrackIds([]);
    try {
      const tracks = await searchSongsInSpotify(ocrResult, spotifyToken);
      setSpotifyTracks(tracks);
      // 기본적으로 found된 곡만 모두 선택
      setSelectedTrackIds(tracks.filter(t => t.found && t.id).map(t => t.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Spotify 검색에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 체크박스 토글
  const handleTrackCheckbox = (trackId: string) => {
    setSelectedTrackIds(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  // Spotify 플레이리스트 생성
  const handleCreatePlaylist = async () => {
    if (!spotifyToken) {
      setError("Spotify 인증이 필요합니다.");
      return;
    }
    const foundTracks = spotifyTracks.filter(t => t.found && t.id && selectedTrackIds.includes(t.id)).map(t => t.id);
    if (foundTracks.length === 0) {
      setError("추가할 곡이 없습니다.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setPlaylistUrl(null);
    try {
      const url = await createSpotifyPlaylist(foundTracks, spotifyToken, playlistName || "SnapTunes Playlist");
      setPlaylistUrl(url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "플레이리스트 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8">
      <h1 className="text-3xl font-bold mb-4">SnapTunes</h1>
      <div className="mb-4">
        <label className="block mb-2">이미지 업로드</label>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
      </div>
      <div className="mb-4">
        <label className="block mb-2">또는 곡명 텍스트 입력</label>
        <textarea
          className="border p-2 w-80"
          rows={4}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="곡명과 아티스트 목록을 입력하세요 (줄바꿈 구분)"
        />
      </div>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 disabled:bg-gray-400"
        onClick={handleExtractSongs}
        disabled={isLoading || !text.trim()}
      >
        {isLoading ? "추출 중..." : "곡명 추출하기"}
      </button>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {ocrResult.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold">추출된 곡명 ({ocrResult.length}곡)</h2>
          <ul className="space-y-1">
            {ocrResult.map((song, idx) => (
              <li key={idx} className="text-sm">
                <span className="font-medium">{song.title}</span>
                {song.artist && <span className="text-gray-600"> - {song.artist}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        className="bg-green-600 text-white px-4 py-2 rounded mb-4 disabled:bg-gray-400"
        onClick={handleSpotifyAuth}
        disabled={!!spotifyToken}
      >
        {spotifyToken ? "Spotify 인증 완료" : "Spotify 인증하기"}
      </button>
      <button
        className="bg-emerald-500 text-white px-4 py-2 rounded mb-4 disabled:bg-gray-400"
        onClick={handleSearchSpotify}
        disabled={!spotifyToken || ocrResult.length === 0 || isLoading}
      >
        Spotify에서 곡 검색
      </button>
      {spotifyTracks.length > 0 && (
        <div className="mb-4 w-full max-w-lg">
          <h2 className="font-semibold mb-2">Spotify 검색 결과</h2>
          <ul className="space-y-2">
            {spotifyTracks.map((track, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                {track.albumArt && (
                  <img src={track.albumArt} alt="album" className="w-10 h-10 rounded" />
                )}
                <span className="font-medium">{track.title}</span>
                <span className="text-gray-600">- {track.artist}</span>
                {track.found ? (
                  <>
                    <span className="ml-2 text-green-600">✔</span>
                    <input
                      type="checkbox"
                      className="ml-2"
                      checked={selectedTrackIds.includes(track.id)}
                      onChange={() => handleTrackCheckbox(track.id)}
                      disabled={!track.found}
                    />
                  </>
                ) : (
                  <span className="ml-2 text-red-500">(미검색)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {spotifyTracks.length > 0 && (
        <div className="mb-4 w-full max-w-lg flex flex-col items-start">
          <label className="mb-2">플레이리스트 이름</label>
          <input
            className="border p-2 w-full mb-2"
            value={playlistName}
            onChange={e => setPlaylistName(e.target.value)}
            placeholder="SnapTunes Playlist"
          />
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
            onClick={handleCreatePlaylist}
            disabled={isLoading || !spotifyToken || spotifyTracks.filter(t => t.found && t.id && selectedTrackIds.includes(t.id)).length === 0}
          >
            Spotify 플레이리스트 생성
          </button>
        </div>
      )}
      {playlistUrl && (
        <div className="mt-4">
          <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
            플레이리스트 보기
          </a>
        </div>
      )}
    </main>
  );
}
