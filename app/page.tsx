"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { extractSongTitlesFromText, SongInfo } from "./ocr";
import { searchSongsInSpotify, createSpotifyPlaylist, SpotifyTrack } from "./spotify-api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";

function getAccessTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  return url.searchParams.get("spotify_access_token");
}

type Step = number;

const CARD_COLORS = [
  "#fde047", // yellow-200
  "#f9a8d4", // pink-200
  "#bae6fd", // blue-200
  "#d9f99d", // lime-200
];

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
  const [step, setStep] = useState<Step>(1);

  // 카드 애니메이션 상태
  const [reveal, setReveal] = useState(false);
  const [cardColor, setCardColor] = useState(CARD_COLORS[0]);
  const [pendingColor, setPendingColor] = useState(CARD_COLORS[0]);
  const [contentIdx, setContentIdx] = useState(0);
  const [pendingIdx, setPendingIdx] = useState(0);
  const [cardHeight, setCardHeight] = useState(260);
  const contentRef = useRef<HTMLDivElement>(null);

  // 단계별 상태
  const [isExtracted, setIsExtracted] = useState(false);
  const [isSearched, setIsSearched] = useState(false);

  // 카드 내용 정의
  const stepCards = [
    {
      color: CARD_COLORS[0],
      content: (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl tracking-wider">1. Spotify Authentication</span>
            {spotifyToken && <span className="text-green-700 font-bold">Done</span>}
          </div>
          <p className="text-base text-neutral-700 mb-4 font-mono">You need to log in with your Spotify account to create a playlist.</p>
          <Button onClick={handleSpotifyAuth} disabled={!!spotifyToken} variant="neutral">
            {spotifyToken ? "Spotify Authenticated" : "Authenticate with Spotify"}
          </Button>
        </>
      ),
      minHeight: 260
    },
    {
      color: CARD_COLORS[1],
      content: (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl tracking-wider">2. Enter Song Titles / Artists</span>
            {ocrResult.length > 0 && <span className="text-green-700 font-bold">Done</span>}
          </div>
          <p className="text-base text-neutral-700 mb-4 font-mono">Upload an image (not implemented) or enter song titles/artists directly.</p>
          <div className="mb-4">
            <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={step !== 2} className="border-2 border-black rounded bg-white" />
          </div>
          <Textarea
            rows={4}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Enter song titles and artists (one per line)"
            disabled={step !== 2}
          />
          <Button
            onClick={async () => { await handleExtractSongs(); }}
            disabled={isLoading || !text.trim() || step !== 2}
            className="w-full font-bold border-2 border-black shadow-[3px_3px_0_0_#222] bg-white text-black hover:bg-black hover:text-white transition"
          >
            {isLoading && step === 2 ? "Extracting..." : "Extract Song Titles"}
          </Button>
          {ocrResult.length > 0 && (
            <>
              <ul className="mt-4 space-y-1 text-base">
                {ocrResult.map((song, idx) => (
                  <li key={idx}>
                    <span className="font-bold">{song.title}</span>
                    {song.artist && <span className="text-gray-700"> - {song.artist}</span>}
          </li>
                ))}
              </ul>
              <Button
                variant="neutral"
                className="mt-6 w-full"
                onClick={() => goToStep(3)}
                disabled={!isExtracted}
              >
                Next
              </Button>
            </>
          )}
        </>
      ),
      minHeight: 340
    },
    {
      color: CARD_COLORS[2],
      content: (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl tracking-wider">3. Search Songs on Spotify</span>
            {spotifyTracks.length > 0 && <span className="text-green-700 font-bold">Done</span>}
          </div>
          <p className="text-base text-neutral-700 mb-4 font-mono">Search for the extracted songs/artists on Spotify.</p>
          {spotifyTracks.length > 0 && (
            <>
              <ul className="mt-4 space-y-2">
                {spotifyTracks.map((track, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-base w-full">
                    {/* 앨범 커버 */}
                    {track.albumArt && (
                      <img src={track.albumArt} alt="album" className="w-10 h-10 rounded border-2 border-black shrink-0" />
                    )}
                    {/* 노래 정보 */}
                    <div className="relative flex-1 min-w-0">
                      <span className="font-bold text-black max-w-full inline-block truncate align-middle" style={{verticalAlign:'middle'}}>
                        {track.title}
                      </span>
                      <span className="text-gray-700 max-w-full inline-block truncate align-middle ml-1" style={{verticalAlign:'middle'}}>
                        - {track.artist}
                      </span>
                      {/* 그라데이션 오버레이 */}
                      <span className="pointer-events-none absolute right-0 top-0 h-full w-12" style={{background: 'linear-gradient(to right, rgba(255,255,255,0), #bae6fd 80%)'}} />
                    </div>
                    {/* 체크박스 or Not found 표시 (오른쪽 끝) */}
                    {track.found ? (
                      <input
                        type="checkbox"
                        className="ml-auto accent-black border-4 border-black rounded-none shadow-[2px_2px_0_0_#222] w-5 h-5 shrink-0"
                        checked={selectedTrackIds.includes(track.id)}
                        onChange={() => handleTrackCheckbox(track.id)}
                        disabled={step !== 3}
                      />
                    ) : (
                      <span className="ml-auto text-red-500 font-bold">(Not found)</span>
                    )}
          </li>
                ))}
              </ul>
              <Button
                variant="neutral"
                className="mt-6 w-full"
                onClick={() => goToStep(4)}
                disabled={!isSearched}
              >
                Next
              </Button>
            </>
          )}
        </>
      ),
      minHeight: 340
    },
    {
      color: CARD_COLORS[3],
      content: (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl tracking-wider">4. Create Playlist</span>
            {playlistUrl && <span className="text-green-700 font-bold">Done</span>}
          </div>
          <p className="text-base text-neutral-700 mb-4 font-mono">Create a Spotify playlist with the selected songs.</p>
          <Input
            className="mb-2 border-2 border-black rounded bg-white"
            value={playlistName}
            onChange={e => setPlaylistName(e.target.value)}
            placeholder="SnapTunes Playlist"
            disabled={step !== 4}
          />
          <Button
            onClick={handleCreatePlaylist}
            disabled={isLoading || !spotifyToken || spotifyTracks.filter(t => t.found && t.id && selectedTrackIds.includes(t.id)).length === 0 || step !== 4}
            className="w-full font-bold border-2 border-black shadow-[3px_3px_0_0_#222] bg-white text-black hover:bg-black hover:text-white transition"
          >
            {isLoading && step === 4 ? "Creating..." : "Create Spotify Playlist"}
          </Button>
          {playlistUrl && (
            <div className="mt-4">
              <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 font-bold">
                View Playlist
              </a>
            </div>
          )}
        </>
      ),
      minHeight: 220
    }
  ];

  // Inkdrop 애니메이션: 카드 내용은 바뀌지 않고, 위에 원이 퍼진 뒤 내용/색/높이 변경
  useEffect(() => {
    if (contentIdx === step - 1) return;
    setPendingColor(stepCards[step - 1].color);
    setPendingIdx(step - 1);
    setCardColor(stepCards[step - 1].color);
    setContentIdx(step - 1);
    setCardHeight(stepCards[step - 1].minHeight);
    setReveal(false);
    const timeout1 = setTimeout(() => {
      setReveal(true);
    }, 40);
    const timeout2 = setTimeout(() => {
      setReveal(false); // 원을 다시 숨김
    }, 640);
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [step]);

  // 카드 높이 자동 측정 (내용이 바뀔 때마다)
  useEffect(() => {
    if (contentRef.current) {
      setCardHeight(contentRef.current.offsetHeight + 32); // 패딩 고려
    }
  }, [contentIdx, ocrResult.length, spotifyTracks.length, playlistUrl]);

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

  // 인증 완료 시 2단계로 이동
  useEffect(() => {
    if (spotifyToken && step === 1) {
      setStep(2);
    }
  }, [spotifyToken, step]);

  // Spotify 인증 시작
  function handleSpotifyAuth() {
    window.location.href = "/api/auth/spotify";
  }

  // 이미지 업로드 핸들러 (미구현)
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  }

  // 곡명 추출
  async function handleExtractSongs() {
    if (!text.trim()) {
      setError("Please enter text.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setOcrResult([]);
    setSpotifyTracks([]);
    setPlaylistUrl(null);
    setSelectedTrackIds([]);
    setIsExtracted(false);
    try {
      const { songs, playlist_title } = await extractSongTitlesFromText(text);
      setOcrResult(songs);
      setIsExtracted(true);
      if (playlist_title && playlist_title.trim()) {
        setPlaylistName(playlist_title.trim());
      } else {
        // 오늘 날짜 기반 기본 이름
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setPlaylistName(`SnapTunes Playlist (${yyyy}-${mm}-${dd})`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to extract song titles.");
    } finally {
      setIsLoading(false);
    }
  }

  // Spotify에서 곡 검색
  async function handleSearchSpotify() {
    if (!spotifyToken) {
      setError("Spotify authentication is required.");
      return;
    }
    if (ocrResult.length === 0) {
      setError("No song titles extracted.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSpotifyTracks([]);
    setPlaylistUrl(null);
    setSelectedTrackIds([]);
    setIsSearched(false);
    try {
      const tracks = await searchSongsInSpotify(ocrResult, spotifyToken);
      setSpotifyTracks(tracks);
      setSelectedTrackIds(tracks.filter(t => t.found && t.id).map(t => t.id));
      setIsSearched(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to search on Spotify.");
    } finally {
      setIsLoading(false);
    }
  }

  // 3단계 진입 시 자동 검색
  useEffect(() => {
    if (step === 3 && !isSearched && !isLoading) {
      handleSearchSpotify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // 체크박스 토글
  function handleTrackCheckbox(trackId: string) {
    setSelectedTrackIds(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  }

  // Spotify 플레이리스트 생성
  async function handleCreatePlaylist() {
    if (!spotifyToken) {
      setError("Spotify authentication is required.");
      return;
    }
    const foundTracks = spotifyTracks.filter(t => t.found && t.id && selectedTrackIds.includes(t.id)).map(t => t.id);
    if (foundTracks.length === 0) {
      setError("No songs to add.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setPlaylistUrl(null);
    try {
      const url = await createSpotifyPlaylist(foundTracks, spotifyToken, playlistName || "SnapTunes Playlist");
      setPlaylistUrl(url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create playlist.");
    } finally {
      setIsLoading(false);
    }
  }

  // Step 이동 함수
  function goToStep(target: number) {
    const next = Math.max(1, Math.min(4, target));
    // 단계별 진행 조건 체크
    if (next > 1 && !spotifyToken) {
      setError("Please authenticate with Spotify first.");
      return;
    }
    if (next > 2 && !isExtracted) {
      setError("Please extract song titles first.");
      return;
    }
    if (next > 3 && !isSearched) {
      setError("Please search songs on Spotify first.");
      return;
    }
    setStep(next);
    setError(null);
    // 상태 초기화는 해당 단계가 아닐 때만
    if (next < 2) setIsExtracted(false);
    if (next < 3) setIsSearched(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start py-8 px-4 md:py-16">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center mb-8 max-w-32 mx-auto md:max-w-md">
          <Image src="/snaptunes_logo.png" alt="SnapTunes Logo" className="mb-2" width={200} height={200} />
        </div>
        {/* Step Indicator & Navigation (카드 위) */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            variant="default"
            size="icon"
            onClick={() => goToStep(step - 1)}
            disabled={step === 1 || step === 2}
            aria-label="Previous step"
          >
            <ChevronLeft size={32} strokeWidth={4} />
          </Button>
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={
                  `w-6 h-6 flex items-center justify-center font-bold text-xs ` +
                  `border-4 border-black ` +
                  `rounded-none select-none transition ` +
                  (step === s
                    ? "bg-yellow-300 text-black scale-110"
                    : "bg-white text-neutral-400 opacity-70")
                }
                style={{ boxSizing: 'border-box' }}
              >
                {s}
              </span>
            ))}
          </div>
          <Button
            variant="default"
            size="icon"
            onClick={() => goToStep(step + 1)}
            disabled={
              step === stepCards.length ||
              (step === 1 && !spotifyToken) ||
              (step === 2 && !isExtracted) ||
              (step === 3 && !isSearched)
            }
            aria-label="Next step"
          >
            <ChevronRight size={32} strokeWidth={4} />
          </Button>
        </div>
        {/* 카드 애니메이션 */}
        <div
          className="relative flex items-start justify-center w-full"
          style={{ minHeight: 220, height: cardHeight, transition: "height 0.5s cubic-bezier(.77,0,.18,1)" }}
        >
          <Card
            className="relative w-full border-4 border-black shadow-[6px_6px_0_0_#222] rounded-none overflow-hidden"
            style={{ background: cardColor, minHeight: 180, transition: "background 0.3s cubic-bezier(.77,0,.18,1)" }}
          >
            {/* Inkdrop 원 애니메이션 (위에만) */}
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{
                background: pendingColor,
                borderRadius: 24,
                transition: "clip-path 0.6s cubic-bezier(.77,0,.18,1), opacity 0.2s",
                clipPath: reveal
                  ? "circle(120% at 50% 50%)"
                  : "circle(0% at 50% 50%)",
                opacity: reveal ? 1 : 0,
                pointerEvents: "none"
              }}
            />
            <div className="relative z-30 p-8" ref={contentRef}>
              {(() => {
                if (contentIdx === 0) return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xl tracking-wider">1. Spotify Authentication</span>
                      {spotifyToken && <span className="text-green-700 font-bold">Done</span>}
                    </div>
                    <p className="text-base text-neutral-700 mb-4 font-mono">You need to log in with your Spotify account to create a playlist.</p>
                    <Button onClick={handleSpotifyAuth} disabled={!!spotifyToken} variant="neutral" className="w-full">
                      {spotifyToken ? "Spotify Authenticated" : "Authenticate with Spotify"}
                    </Button>
                  </>
                );
                if (contentIdx === 1) return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xl tracking-wider">2. Enter Song Titles / Artists</span>
                      {ocrResult.length > 0 && <span className="text-green-700 font-bold">Done</span>}
                    </div>
                    <p className="text-base text-neutral-700 mb-4 font-mono">Upload an image (not implemented) or enter song titles/artists directly.</p>
                    <div className="mb-4">
                      <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={step !== 2} className="border-2 border-black rounded bg-white" />
                    </div>
                    <Textarea
                      className="mb-4 bg-white"
                      rows={4}
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Enter song titles and artists (one per line)"
                      disabled={step !== 2}
                    />
                    <Button
                      variant="neutral"
                      onClick={async () => { await handleExtractSongs(); }}
                      disabled={isLoading || !text.trim() || step !== 2}
                      className="w-full"
                    >
                      {isLoading && step === 2 ? "Extracting..." : "Extract Song Titles"}
                    </Button>
                    {ocrResult.length > 0 && (
                      <>
                        <ul className="mt-4 space-y-1 text-base">
                          {ocrResult.map((song, idx) => (
                            <li key={idx}>
                              <span className="font-bold">{song.title}</span>
                              {song.artist && <span className="text-gray-700"> - {song.artist}</span>}
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant="neutral"
                          className="mt-6 w-full"
                          onClick={() => goToStep(3)}
                          disabled={!isExtracted}
                        >
                          Next
                        </Button>
                      </>
                    )}
                  </>
                );
                if (contentIdx === 2) return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xl tracking-wider">3. Search Songs on Spotify</span>
                      {spotifyTracks.length > 0 && <span className="text-green-700 font-bold">Done</span>}
                    </div>
                    <p className="text-base text-neutral-700 mb-4 font-mono">Search for the extracted songs/artists on Spotify.</p>
                    {spotifyTracks.length > 0 && (
                      <>
                        <ul className="mt-4 space-y-2">
                          {spotifyTracks.map((track, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-base w-full">
                              {/* 앨범 커버 */}
                              {track.albumArt && (
                                <img src={track.albumArt} alt="album" className="w-10 h-10 rounded border-2 border-black shrink-0" />
                              )}
                              {/* 노래 정보 */}
                              <div className="relative flex-1 min-w-0">
                                <span className="font-bold text-black max-w-full inline-block truncate align-middle" style={{verticalAlign:'middle'}}>
                                  {track.title}
                                </span>
                                <span className="text-gray-700 max-w-full inline-block truncate align-middle ml-1" style={{verticalAlign:'middle'}}>
                                  - {track.artist}
                                </span>
                                {/* 그라데이션 오버레이 */}
                                <span className="pointer-events-none absolute right-0 top-0 h-full w-12" style={{background: 'linear-gradient(to right, rgba(255,255,255,0), #bae6fd 80%)'}} />
                              </div>
                              {/* 체크박스 or Not found 표시 (오른쪽 끝) */}
                              {track.found ? (
                                <input
                                  type="checkbox"
                                  className="ml-auto accent-black border-4 border-black rounded-none shadow-[2px_2px_0_0_#222] w-5 h-5 shrink-0"
                                  checked={selectedTrackIds.includes(track.id)}
                                  onChange={() => handleTrackCheckbox(track.id)}
                                  disabled={step !== 3}
                                />
                              ) : (
                                <span className="ml-auto text-red-500 font-bold">(Not found)</span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant="neutral"
                          className="mt-6 w-full"
                          onClick={() => goToStep(4)}
                          disabled={!isSearched}
                        >
                          Next
                        </Button>
                      </>
                    )}
                  </>
                );
                if (contentIdx === 3) return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xl tracking-wider">4. Create Playlist</span>
                      {playlistUrl && <span className="text-green-700 font-bold">Done</span>}
                    </div>
                    <p className="text-base text-neutral-700 mb-4 font-mono">Create a Spotify playlist with the selected songs.</p>
                    <Input
                      className="mb-2 border-2 border-black rounded bg-white"
                      value={playlistName}
                      onChange={e => setPlaylistName(e.target.value)}
                      placeholder="SnapTunes Playlist"
                      disabled={step !== 4}
                    />
                    <Button
                      variant="neutral"
                      onClick={handleCreatePlaylist}
                      disabled={isLoading || !spotifyToken || spotifyTracks.filter(t => t.found && t.id && selectedTrackIds.includes(t.id)).length === 0 || step !== 4}
                      className="w-full"
                    >
                      {isLoading && step === 4 ? "Creating..." : "Create Spotify Playlist"}
                    </Button>
                    {playlistUrl && (
                      <div className="mt-4">
                        <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 font-bold">
                          View Playlist
                        </a>
                      </div>
                    )}
                  </>
                );
                return null;
              })()}
              {/* Neo-brutalism Progress Bar (2,3단계 로딩 중) */}
              {(isLoading && (step === 2 || step === 3)) && (
                <div className="absolute left-0 right-0 bottom-0 px-8 pb-8 z-40">
                  <Progress value={70} className="w-full h-6 border-4 border-black rounded-none shadow-[2px_2px_0_0_#222] bg-yellow-200" />
                  <div className="text-center text-xs font-bold mt-1 text-black" style={{textShadow:'1px 1px 0 #fff'}}>Loading...</div>
                </div>
              )}
            </div>
          </Card>
        </div>
        {/* Error message */}
        {error && (
          <Card className="p-4 border-red-400 border-2 bg-red-50 mt-4 rounded-none">
            <div className="text-red-700 text-sm">{error}</div>
          </Card>
        )}
    </div>
    </main>
  );
}
