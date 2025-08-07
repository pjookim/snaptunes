'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter } from 'next/navigation'
import { extractSongTitlesFromText, SongInfo } from '../ocr'
import {
  searchSongsInSpotify,
  createSpotifyPlaylist,
  SpotifyTrack,
  CreatedPlaylistInfo,
} from '../spotify-api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ThemeToggle from '@/components/ThemeToggle'

function getAccessTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const url = new URL(window.location.href)
  return url.searchParams.get('spotify_access_token')
}

// URL에서 step 파라미터 가져오기
function getStepFromUrl(): number {
  if (typeof window === 'undefined') return 1
  const url = new URL(window.location.href)
  const stepParam = url.searchParams.get('step')
  return stepParam ? parseInt(stepParam, 10) : 1
}

// URL에 step 파라미터 설정하기
function setStepInUrl(step: number) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('step', step.toString())
  window.history.replaceState({}, document.title, url.toString())
}

// localStorage에 상태 저장하기
function saveStateToStorage(state: any) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('snaptunes_state', JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error)
  }
}

// localStorage에서 상태 복원하기
function loadStateFromStorage() {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem('snaptunes_state')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error)
    return null
  }
}

// Spotify 토큰 관련 함수들
function saveSpotifyTokens(
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
) {
  if (typeof window === 'undefined') return
  try {
    const tokens = {
      accessToken,
      refreshToken,
      expiresAt,
      timestamp: Date.now(),
    }
    localStorage.setItem('snaptunes_spotify_tokens', JSON.stringify(tokens))
  } catch (error) {
    console.warn('Failed to save Spotify tokens:', error)
  }
}

function loadSpotifyTokens() {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem('snaptunes_spotify_tokens')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.warn('Failed to load Spotify tokens:', error)
    return null
  }
}

function clearSpotifyTokens() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('snaptunes_spotify_tokens')
  } catch (error) {
    console.warn('Failed to clear Spotify tokens:', error)
  }
}

// 토큰 갱신 함수
async function refreshSpotifyToken(refreshToken: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
} | null> {
  try {
    const response = await fetch('/api/auth/spotify/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    }
  } catch (error) {
    console.error('Token refresh failed:', error)
    return null
  }
}

// 안전한 토큰 가져오기 (필요시 갱신) - setSpotifyToken 콜백을 받음
async function getValidSpotifyToken(
  setTokenCallback?: (token: string | null) => void,
): Promise<string | null> {
  const savedTokens = loadSpotifyTokens()
  if (!savedTokens || !savedTokens.accessToken || !savedTokens.refreshToken) {
    return null
  }

  const now = Date.now()

  // 토큰이 아직 유효한지 확인 (5분 여유)
  if (savedTokens.expiresAt > now + 5 * 60 * 1000) {
    return savedTokens.accessToken
  }

  // 토큰 갱신 시도
  const refreshed = await refreshSpotifyToken(savedTokens.refreshToken)
  if (refreshed) {
    const newExpiresAt = Date.now() + refreshed.expiresIn * 1000
    saveSpotifyTokens(
      refreshed.accessToken,
      refreshed.refreshToken,
      newExpiresAt,
    )
    if (setTokenCallback) {
      setTokenCallback(refreshed.accessToken)
    }
    return refreshed.accessToken
  } else {
    // 갱신 실패: 저장된 토큰 삭제
    clearSpotifyTokens()
    if (setTokenCallback) {
      setTokenCallback(null)
    }
    return null
  }
}

// Spotify 사용자 정보 가져오기
async function getSpotifyUserInfo(accessToken: string): Promise<{
  id: string
  displayName: string
  email: string
  imageUrl?: string
} | null> {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user info')
    }

    const userData = await response.json()
    return {
      id: userData.id,
      displayName: userData.display_name,
      email: userData.email,
      imageUrl: userData.images?.[0]?.url,
    }
  } catch (error) {
    console.error('Failed to get Spotify user info:', error)
    return null
  }
}

type Step = number

const CARD_COLORS = [
  '#fde047', // yellow-200
  '#f9a8d4', // pink-200
  '#bae6fd', // blue-200
  '#d9f99d', // lime-200
]

export default function Home() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [image, setImage] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [ocrResult, setOcrResult] = useState<SongInfo[]>([])
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null)
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([])
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([])
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [playlistName, setPlaylistName] = useState(t('defaults.playlistName'))
  const [step, setStep] = useState<Step>(() => getStepFromUrl())
  const [playlistMeta, setPlaylistMeta] = useState<CreatedPlaylistInfo | null>(
    null,
  )
  const [spotifyUser, setSpotifyUser] = useState<{
    id: string
    displayName: string
    email: string
    imageUrl?: string
  } | null>(null)

  // 카드 애니메이션 상태
  const [reveal, setReveal] = useState(false)
  const [cardColor, setCardColor] = useState(CARD_COLORS[0])
  const [pendingColor, setPendingColor] = useState(CARD_COLORS[0])
  const [contentIdx, setContentIdx] = useState(0)
  const [pendingIdx, setPendingIdx] = useState(0)
  const [cardHeight, setCardHeight] = useState(260)
  const contentRef = useRef<HTMLDivElement>(null)

  // 단계별 상태
  const [isExtracted, setIsExtracted] = useState(false)
  const [isSearched, setIsSearched] = useState(false)

  // 카드 내용 정의
  const stepCards = [
    {
      color: CARD_COLORS[0],
      content: (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl tracking-wider">
              {t('steps.step1.title')}
            </span>
            {spotifyToken && (
              <span className="text-green-700 font-bold">
                {t('steps.step1.done')}
              </span>
            )}
          </div>
          <p className="text-base text-neutral-700 mb-4 font-mono">
            {t('steps.step1.description')}
          </p>
          <Button
            onClick={handleSpotifyAuth}
            disabled={!!spotifyToken}
            variant="neutral"
          >
            {spotifyToken
              ? t('steps.step1.buttonAuthenticated')
              : t('steps.step1.button')}
          </Button>
        </>
      ),
      minHeight: 260,
    },
    {
      color: CARD_COLORS[1],
      content: (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl tracking-wider text-black">
              {t('steps.step2.title')}
            </span>
            {ocrResult.length > 0 && (
              <span className="text-green-700 font-bold">
                {t('steps.step2.done')}
              </span>
            )}
          </div>
          <p className="text-base text-neutral-700 mb-4 font-mono">
            {t('steps.step2.description')}
          </p>
          <div className="mb-4">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={step !== 2}
              className="border-2 border-black rounded bg-white"
            />
          </div>
          <Textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('steps.step2.placeholder')}
            disabled={step !== 2}
          />
          <Button
            onClick={async () => {
              await handleExtractSongs()
            }}
            disabled={isLoading || !text.trim() || step !== 2}
            className="w-full font-bold border-2 border-black shadow-[3px_3px_0_0_#222] bg-white text-black hover:bg-black hover:text-white transition"
          >
            {isLoading && step === 2
              ? t('steps.step2.loading')
              : t('steps.step2.button')}
          </Button>
          {ocrResult.length > 0 && (
            <>
              <ul className="mt-4 space-y-1 text-base">
                {ocrResult.map((song, idx) => (
                  <li key={idx}>
                    <span className="font-bold">{song.title}</span>
                    {song.artist && (
                      <span className="text-gray-700"> - {song.artist}</span>
                    )}
                  </li>
                ))}
              </ul>
              <Button
                variant="neutral"
                className="mt-6 w-full"
                onClick={() => goToStep(3)}
                disabled={!isExtracted}
              >
                {t('steps.step2.next')}
              </Button>
            </>
          )}
        </>
      ),
      minHeight: 340,
    },
    {
      color: CARD_COLORS[2],
      content: (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl tracking-wider">
              {t('steps.step3.title')}
            </span>
            {spotifyTracks.length > 0 && (
              <span className="text-green-700 font-bold">
                {t('steps.step3.done')}
              </span>
            )}
          </div>
          <p className="text-base text-neutral-700 mb-4 font-mono">
            {t('steps.step3.description')}
          </p>
          {spotifyTracks.length > 0 && (
            <>
              <ul className="mt-4 space-y-2">
                {spotifyTracks.map((track, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-base w-full"
                  >
                    {/* 앨범 커버 */}
                    {track.albumArt && (
                      <img
                        src={track.albumArt}
                        alt={t('common.album')}
                        className="w-10 h-10 rounded border-2 border-black shrink-0"
                      />
                    )}
                    {/* 노래 정보 */}
                    <div
                      className="relative flex-1 min-w-0 overflow-x-hidden whitespace-nowrap"
                      style={{ overflowX: 'hidden', whiteSpace: 'nowrap' }}
                    >
                      <span
                        className="font-bold text-black max-w-full inline-block truncate align-middle"
                        style={{ verticalAlign: 'middle' }}
                      >
                        {track.title}
                      </span>
                      <span
                        className="text-gray-700 max-w-full inline-block truncate align-middle ml-1"
                        style={{ verticalAlign: 'middle' }}
                      >
                        - {track.artist}
                      </span>
                      {/* 항상 표시되는 그라데이션 오버레이 */}
                      <span
                        className="pointer-events-none absolute right-0 top-0 h-full w-12"
                        style={{
                          background:
                            'linear-gradient(to right, rgba(255,255,255,0), #bae6fd 80%)',
                          pointerEvents: 'none',
                        }}
                      />
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
                      <span className="ml-auto text-red-500 font-bold">
                        {t('steps.step3.notFound')}
                      </span>
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
                {t('steps.step3.next')}
              </Button>
            </>
          )}
        </>
      ),
      minHeight: 340,
    },
    {
      color: CARD_COLORS[3],
      content: (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl tracking-wider">
              {t('steps.step4.title')}
            </span>
            {playlistUrl && (
              <span className="text-green-700 font-bold">
                {t('steps.step4.done')}
              </span>
            )}
          </div>
          <p className="text-base text-neutral-700 mb-4 font-mono">
            {t('steps.step4.description')}
          </p>
          <Input
            className="mb-2 border-2 border-black rounded bg-white"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder={t('steps.step4.placeholder')}
            disabled={step !== 4}
          />
          <Button
            onClick={handleCreatePlaylist}
            disabled={
              isLoading ||
              !spotifyToken ||
              spotifyTracks.filter(
                (t) => t.found && t.id && selectedTrackIds.includes(t.id),
              ).length === 0 ||
              step !== 4
            }
            className="w-full font-bold border-2 border-black shadow-[3px_3px_0_0_#222] bg-white text-black hover:bg-black hover:text-white transition"
          >
            {isLoading && step === 4
              ? t('steps.step4.creating')
              : t('steps.step4.button')}
          </Button>
          {playlistUrl && (
            <div className="mt-4 flex flex-col items-center gap-2">
              {playlistMeta?.cover && (
                <a
                  href={playlistMeta.playlistUrl || playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={playlistMeta.cover}
                    alt="Playlist Cover"
                    className="w-32 h-32 rounded shadow border-2 border-black mb-2"
                  />
                </a>
              )}
              <div className="text-lg font-bold text-center">
                <a
                  href={playlistMeta?.playlistUrl || playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {playlistMeta?.name || playlistName}
                </a>
              </div>
              <div className="text-sm text-neutral-700 text-center">
                {t('steps.step4.by')}{' '}
                {playlistMeta?.ownerUrl ? (
                  <a
                    href={playlistMeta.ownerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {playlistMeta.ownerName}
                  </a>
                ) : (
                  playlistMeta?.ownerName
                )}
              </div>
            </div>
          )}
        </>
      ),
      minHeight: 220,
    },
  ]

  // Inkdrop 애니메이션: 카드 내용은 바뀌지 않고, 위에 원이 퍼진 뒤 내용/색/높이 변경
  useEffect(() => {
    if (contentIdx === step - 1) return
    setPendingColor(stepCards[step - 1].color)
    setPendingIdx(step - 1)
    setCardColor(stepCards[step - 1].color)
    setContentIdx(step - 1)
    setCardHeight(stepCards[step - 1].minHeight)
    setReveal(false)
    const timeout1 = setTimeout(() => {
      setReveal(true)
    }, 40)
    const timeout2 = setTimeout(() => {
      setReveal(false) // 원을 다시 숨김
    }, 640)
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
    }
  }, [step])

  // 카드 높이 자동 측정 (내용이 바뀔 때마다)
  useEffect(() => {
    if (contentRef.current) {
      setCardHeight(contentRef.current.offsetHeight + 32) // 패딩 고려
    }
  }, [contentIdx, ocrResult.length, spotifyTracks.length, playlistUrl])

  // Spotify 토큰 관리
  useEffect(() => {
    const initializeSpotifyToken = async () => {
      // 1. URL에서 토큰 확인 (새로운 인증)
      const urlToken = getAccessTokenFromUrl()
      const urlRefreshToken = new URL(window.location.href).searchParams.get(
        'spotify_refresh_token',
      )

      if (urlToken && urlRefreshToken) {
        // 새로운 인증: 토큰 저장
        const expiresAt = Date.now() + 3600 * 1000 // 1시간 후 만료
        saveSpotifyTokens(urlToken, urlRefreshToken, expiresAt)
        setSpotifyToken(urlToken)

        // URL에서 토큰 제거 (보안)
        const url = new URL(window.location.href)
        url.searchParams.delete('spotify_access_token')
        url.searchParams.delete('spotify_refresh_token')
        window.history.replaceState({}, document.title, url.toString())
        return
      }

      // 2. localStorage에서 저장된 토큰 확인
      const savedTokens = loadSpotifyTokens()
      if (savedTokens && savedTokens.accessToken && savedTokens.refreshToken) {
        const now = Date.now()

        // 토큰이 만료되었는지 확인 (5분 여유)
        if (savedTokens.expiresAt > now + 5 * 60 * 1000) {
          // 토큰이 아직 유효함
          setSpotifyToken(savedTokens.accessToken)
          return
        }

        // 토큰이 만료되었거나 곧 만료됨: 갱신 시도
        const refreshed = await refreshSpotifyToken(savedTokens.refreshToken)
        if (refreshed) {
          const newExpiresAt = Date.now() + refreshed.expiresIn * 1000
          saveSpotifyTokens(
            refreshed.accessToken,
            refreshed.refreshToken,
            newExpiresAt,
          )
          setSpotifyToken(refreshed.accessToken)
        } else {
          // 갱신 실패: 저장된 토큰 삭제
          clearSpotifyTokens()
        }
      }
    }

    initializeSpotifyToken()
  }, [])

  // URL에서 step 파라미터 복원 (언어 변경 시)
  useEffect(() => {
    const urlStep = getStepFromUrl()
    if (urlStep !== step) {
      setStep(urlStep)
    }
  }, [searchParams])

  // step 변경 시 URL 업데이트
  useEffect(() => {
    setStepInUrl(step)
  }, [step])

  // 중요 상태 변경 시 localStorage에 저장
  useEffect(() => {
    const stateToSave = {
      step,
      text,
      ocrResult,
      spotifyTracks,
      selectedTrackIds,
      playlistName,
      isExtracted,
      isSearched,
      spotifyUser,
      timestamp: Date.now(),
    }
    saveStateToStorage(stateToSave)
  }, [
    step,
    text,
    ocrResult,
    spotifyTracks,
    selectedTrackIds,
    playlistName,
    isExtracted,
    isSearched,
    spotifyUser,
  ])

  // 컴포넌트 마운트 시 localStorage에서 상태 복원
  useEffect(() => {
    const savedState = loadStateFromStorage()
    if (savedState && savedState.timestamp) {
      // 1시간 이내의 저장된 상태만 복원
      const oneHour = 60 * 60 * 1000
      if (Date.now() - savedState.timestamp < oneHour) {
        if (savedState.step) setStep(savedState.step)
        if (savedState.text) setText(savedState.text)
        if (savedState.ocrResult) setOcrResult(savedState.ocrResult)
        if (savedState.spotifyTracks) setSpotifyTracks(savedState.spotifyTracks)
        if (savedState.selectedTrackIds)
          setSelectedTrackIds(savedState.selectedTrackIds)
        if (savedState.playlistName) setPlaylistName(savedState.playlistName)
        if (savedState.isExtracted) setIsExtracted(savedState.isExtracted)
        if (savedState.isSearched) setIsSearched(savedState.isSearched)
        if (savedState.spotifyUser) setSpotifyUser(savedState.spotifyUser)
      }
    }
  }, [])

  // Spotify 토큰이 설정될 때 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (spotifyToken) {
        const userInfo = await getSpotifyUserInfo(spotifyToken)
        setSpotifyUser(userInfo)
      } else {
        setSpotifyUser(null)
      }
    }

    fetchUserInfo()
  }, [spotifyToken])

  // 인증 완료 시 자동 이동은 제거 - 사용자가 직접 선택하도록 함

  // Spotify 인증 시작
  function handleSpotifyAuth() {
    window.location.href = '/api/auth/spotify'
  }

  // Spotify 로그아웃
  function handleSpotifyLogout() {
    clearSpotifyTokens()
    setSpotifyToken(null)
    setSpotifyUser(null)
    setSpotifyTracks([])
    setSelectedTrackIds([])
    setPlaylistUrl(null)
    setPlaylistMeta(null)
    setIsExtracted(false)
    setIsSearched(false)
    setStep(1)
    toast.success(t('common.loggedOut'))
  }

  // 이미지 업로드 핸들러 (OCR 적용, tesseract.js를 동적 import)
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
      setIsLoading(true)
      try {
        // 동적으로 tesseract.js import (클라이언트에서만)
        const Tesseract = (await import('tesseract.js')).default
        const result = await Tesseract.recognize(e.target.files[0], 'eng+kor')
        // According to @types/tesseract.js, result is a Tesseract.TesseractJob, but with async/await, we need to use the callback or wrap in a Promise.
        // However, in practice, tesseract.js >=2.1.0 returns a Promise<{ data: { text: string } }> when using the default import and await.
        // So, let's type result as { data: { text: string } }
        const text: string =
          (result as { data: { text: string } }).data?.text ?? ''
        setText(text) // 텍스트 입력란에 자동 입력
        // 2. 기존 곡명 추출 함수 호출
        await handleExtractSongs(text)
      } catch (err) {
        toast.error(t('errors.imageExtractionFailed'))
      } finally {
        setIsLoading(false)
      }
    }
  }

  // 곡명 추출 (ocrText 인자 허용)
  async function handleExtractSongs(overrideText?: string) {
    const inputText = overrideText ?? text
    if (!inputText.trim()) {
      toast.error(t('errors.enterText'))
      return
    }
    setIsLoading(true)
    setOcrResult([])
    setSpotifyTracks([])
    setPlaylistUrl(null)
    setSelectedTrackIds([])
    setIsExtracted(false)
    try {
      const { songs, playlist_title } =
        await extractSongTitlesFromText(inputText)
      setOcrResult(songs)
      setIsExtracted(true)
      if (songs.length === 0) {
        toast.warning(t('errors.noSongsExtracted'))
      }
      if (playlist_title && playlist_title.trim()) {
        setPlaylistName(playlist_title.trim())
      } else {
        // 오늘 날짜 기반 기본 이름
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        setPlaylistName(`${t('defaults.playlistName')} (${yyyy}-${mm}-${dd})`)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('errors.extractionFailed'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Spotify에서 곡 검색
  async function handleSearchSpotify() {
    const validToken = await getValidSpotifyToken(setSpotifyToken)
    if (!validToken) {
      toast.error(t('errors.spotifyAuthRequired'))
      return
    }
    if (ocrResult.length === 0) {
      toast.error(t('errors.noSongTitles'))
      return
    }
    setIsLoading(true)
    setSpotifyTracks([])
    setPlaylistUrl(null)
    setSelectedTrackIds([])
    setIsSearched(false)
    try {
      const tracks = await searchSongsInSpotify(ocrResult, validToken)
      setSpotifyTracks(tracks)
      setSelectedTrackIds(
        tracks.filter((t) => t.found && t.id).map((t) => t.id),
      )
      setIsSearched(true)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('errors.searchFailed'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  // 3단계 진입 시 자동 검색
  useEffect(() => {
    if (step === 3 && !isSearched && !isLoading) {
      handleSearchSpotify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // 체크박스 토글
  function handleTrackCheckbox(trackId: string) {
    setSelectedTrackIds((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId],
    )
  }

  // Spotify 플레이리스트 생성
  async function handleCreatePlaylist() {
    const validToken = await getValidSpotifyToken(setSpotifyToken)
    if (!validToken) {
      toast.error(t('errors.spotifyAuthRequired'))
      return
    }
    const foundTracks = spotifyTracks
      .filter((t) => t.found && t.id && selectedTrackIds.includes(t.id))
      .map((t) => t.id)
    if (foundTracks.length === 0) {
      toast.error(t('errors.noSongsToAdd'))
      return
    }
    setIsLoading(true)
    setPlaylistUrl(null)
    setPlaylistMeta(null)
    try {
      const meta = await createSpotifyPlaylist(
        foundTracks,
        validToken,
        playlistName || t('defaults.playlistName'),
      )
      if (meta) {
        setPlaylistUrl(meta.playlistUrl)
        setPlaylistMeta(meta)
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('errors.createPlaylistFailed'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Step 이동 함수
  function goToStep(target: number) {
    const next = Math.max(1, Math.min(4, target))

    // step 1로 이동하는 경우는 항상 허용
    if (next === 1) {
      setStep(next)
      return
    }

    // 단계별 진행 조건 체크 (step 1로 이동하는 경우 제외)
    if (next > 1 && !spotifyToken) {
      toast.error(t('errors.authenticateFirst'))
      return
    }
    if (next > 2 && !isExtracted) {
      toast.error(t('errors.extractFirst'))
      return
    }
    if (next > 3 && !isSearched) {
      toast.error(t('errors.searchFirst'))
      return
    }

    setStep(next)
    // 상태 초기화는 해당 단계가 아닐 때만
    if (next < 2) setIsExtracted(false)
    if (next < 3) setIsSearched(false)
  }

  // 다크모드 상태 감지
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const checkDark = () => {
      if (typeof window !== 'undefined') {
        setIsDark(document.documentElement.classList.contains('dark'))
      }
    }
    checkDark()
    window.addEventListener('storage', checkDark)
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => {
      window.removeEventListener('storage', checkDark)
      observer.disconnect()
    }
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-start py-4 px-4">
      {/* 언어 변경 + 테마 토글 버튼 - 첫 번째 스텝에서만 활성화 */}
      <div className="w-full flex gap-2">
        {step === 1 && (
          <div className="flex-1 flex justify-start">
            <LanguageSwitcher />
          </div>
        )}
        <div className="flex-1 flex justify-end">
          <ThemeToggle />
        </div>
      </div>
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center my-8 max-w-32 mx-auto md:max-w-md">
          <Image
            src={isDark ? '/snaptunes_logo_dark.svg' : '/snaptunes_logo.svg'}
            alt={t('app.logo')}
            className="mb-2"
            width={200}
            height={200}
            priority
          />
        </div>
        {/* Step Indicator & Navigation (카드 위) */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            variant="default"
            size="icon"
            onClick={() => goToStep(step - 1)}
            disabled={step === 1}
            aria-label={t('navigation.previous')}
          >
            <ChevronLeft size={32} strokeWidth={4} />
          </Button>
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => goToStep(s)}
                className={
                  `w-6 h-6 flex items-center justify-center font-bold text-xs ` +
                  `border-4 border-black ` +
                  `rounded-none transition cursor-pointer ` +
                  (step === s
                    ? 'bg-yellow-300 text-black scale-110'
                    : 'bg-white text-neutral-400 opacity-70 hover:bg-gray-100 hover:opacity-100')
                }
                style={{ boxSizing: 'border-box' }}
                aria-label={`Go to step ${s}`}
              >
                {s}
              </button>
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
            aria-label={t('navigation.next')}
          >
            <ChevronRight size={32} strokeWidth={4} />
          </Button>
        </div>
        {/* 카드 애니메이션 */}
        <div
          className="relative flex items-start justify-center w-full"
          style={{
            minHeight: 220,
            height: cardHeight,
            transition: 'height 0.5s cubic-bezier(.77,0,.18,1)',
          }}
        >
          <Card
            className="relative w-full border-4 border-black shadow-[6px_6px_0_0_#222] rounded-none overflow-hidden"
            style={{
              background: cardColor,
              minHeight: 180,
              transition: 'background 0.3s cubic-bezier(.77,0,.18,1)',
            }}
          >
            {/* Inkdrop 원 애니메이션 (위에만) */}
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{
                background: pendingColor,
                borderRadius: 24,
                transition:
                  'clip-path 0.6s cubic-bezier(.77,0,.18,1), opacity 0.2s',
                clipPath: reveal
                  ? 'circle(120% at 50% 50%)'
                  : 'circle(0% at 50% 50%)',
                opacity: reveal ? 1 : 0,
                pointerEvents: 'none',
              }}
            />
            <div className="relative z-30 p-8" ref={contentRef}>
              {(() => {
                if (contentIdx === 0)
                  return (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xl tracking-wider text-black">
                          {t('steps.step1.title')}
                        </span>
                        {spotifyToken && (
                          <span className="text-green-700 font-bold">
                            {t('steps.step1.done')}
                          </span>
                        )}
                      </div>
                      <p className="text-base text-neutral-700 mb-4 font-mono">
                        {t('steps.step1.description')}
                      </p>
                      {spotifyToken && spotifyUser ? (
                        <div className="relative">
                          <div className="flex flex-row items-stretch bg-white border-2 border-black rounded-base shadow-[2px_2px_0_0_#222]">
                            {/* 프로필 정보 */}
                            <div className="flex-1 p-4 flex flex-col justify-center">
                              <div className="flex items-center gap-3">
                                {spotifyUser.imageUrl && (
                                  <Image
                                    width={48}
                                    height={48}
                                    src={spotifyUser.imageUrl}
                                    alt={t('common.profile')}
                                    className="w-12 h-12 rounded-full border-2 p-0.5 border-black"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="font-bold text-lg text-black">
                                    {spotifyUser.displayName}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {spotifyUser.email}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* 세로 로그아웃 버튼 */}
                            <div className="flex flex-col items-center justify-center px-4 border-l-2 border-black min-h-full">
                              <Button
                                variant="neutral"
                                size="icon"
                                aria-label={t('steps.step1.logout')}
                                onClick={handleSpotifyLogout}
                              >
                                <LogOut size={32} strokeWidth={3} />
                              </Button>
                            </div>
                          </div>
                          <Button
                            variant="neutral"
                            className="mt-6 w-full"
                            onClick={() => goToStep(2)}
                            disabled={!spotifyToken}
                          >
                            {t('steps.step1.next')}
                          </Button>
                        </div>
                      ) : spotifyToken ? (
                        <div className="space-y-2">
                          <div className="bg-white border-2 border-black p-4 rounded-none shadow-[2px_2px_0_0_#222] text-center">
                            <div className="text-sm text-gray-600">
                              {t('common.loading')}
                            </div>
                          </div>
                          <Button variant="neutral" className="w-full" disabled>
                            {t('steps.step1.buttonAuthenticated')}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleSpotifyAuth}
                          variant="neutral"
                          className="w-full"
                        >
                          {t('steps.step1.button')}
                        </Button>
                      )}
                    </>
                  )
                if (contentIdx === 1)
                  return (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xl tracking-wider text-black">
                          {t('steps.step2.title')}
                        </span>
                        {ocrResult.length > 0 && (
                          <span className="text-green-700 font-bold">
                            {t('steps.step2.done')}
                          </span>
                        )}
                      </div>
                      <p className="text-base text-neutral-700 mb-4 font-mono">
                        {t('steps.step2.description')}
                      </p>
                      <div className="mb-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={step !== 2}
                          className="border-2 border-black rounded bg-white"
                        />
                      </div>
                      <Textarea
                        className="mb-4 bg-white"
                        rows={4}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={t('steps.step2.placeholder')}
                        disabled={step !== 2}
                      />
                      {isLoading && step === 2 ? (
                        <div className="w-full">
                          <Progress
                            value={70}
                            className="w-full h-6 border-4 border-black rounded-none shadow-[2px_2px_0_0_#222] bg-yellow-200"
                          />
                          <div
                            className="text-center text-xs font-bold mt-1 text-black"
                            style={{ textShadow: '1px 1px 0 #fff' }}
                          >
                            {t('common.loading')}
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="neutral"
                          onClick={async () => {
                            await handleExtractSongs()
                          }}
                          disabled={isLoading || !text.trim() || step !== 2}
                          className="w-full"
                        >
                          {t('steps.step2.button')}
                        </Button>
                      )}
                      {ocrResult.length > 0 && (
                        <>
                          <ul className="mt-4 space-y-1 text-black">
                            {ocrResult.map((song, idx) => (
                              <li key={idx}>
                                <span className="font-bold">{song.title}</span>
                                {song.artist && (
                                  <span className="text-gray-700">
                                    {' '}
                                    - {song.artist}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          <Button
                            variant="neutral"
                            className="mt-6 w-full"
                            onClick={() => goToStep(3)}
                            disabled={!isExtracted}
                          >
                            {t('steps.step2.next')}
                          </Button>
                        </>
                      )}
                    </>
                  )
                if (contentIdx === 2)
                  return (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xl tracking-wider text-black">
                          {t('steps.step3.title')}
                        </span>
                        {spotifyTracks.length > 0 && (
                          <span className="text-green-700 font-bold">
                            {t('steps.step3.done')}
                          </span>
                        )}
                      </div>
                      <p className="text-base text-neutral-700 mb-4 font-mono">
                        {t('steps.step3.description')}
                      </p>
                      {spotifyTracks.length > 0 && (
                        <>
                          <ul className="mt-4 space-y-2">
                            {spotifyTracks.map((track, idx) => (
                              <li
                                key={idx}
                                className="flex items-center gap-2 text-base w-full"
                              >
                                {/* 앨범 커버 */}
                                {track.albumArt && (
                                  <img
                                    src={track.albumArt}
                                    alt={t('common.album')}
                                    className="w-10 h-10 rounded border-2 border-black shrink-0"
                                  />
                                )}
                                {/* 노래 정보 */}
                                <div
                                  className="relative flex-1 min-w-0 overflow-x-hidden whitespace-nowrap"
                                  style={{
                                    overflowX: 'hidden',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <span
                                    className="font-bold text-black max-w-full inline-block truncate align-middle"
                                    style={{ verticalAlign: 'middle' }}
                                  >
                                    {track.title}
                                  </span>
                                  <span
                                    className="text-gray-700 max-w-full inline-block truncate align-middle ml-1"
                                    style={{ verticalAlign: 'middle' }}
                                  >
                                    - {track.artist}
                                  </span>
                                  {/* 항상 표시되는 그라데이션 오버레이 */}
                                  <span
                                    className="pointer-events-none absolute right-0 top-0 h-full w-12"
                                    style={{
                                      background:
                                        'linear-gradient(to right, rgba(255,255,255,0), #bae6fd 80%)',
                                      pointerEvents: 'none',
                                    }}
                                  />
                                </div>
                                {/* 체크박스 or Not found 표시 (오른쪽 끝) */}
                                {track.found ? (
                                  <input
                                    type="checkbox"
                                    className="ml-auto accent-black border-4 border-black rounded-none shadow-[2px_2px_0_0_#222] w-5 h-5 shrink-0"
                                    checked={selectedTrackIds.includes(
                                      track.id,
                                    )}
                                    onChange={() =>
                                      handleTrackCheckbox(track.id)
                                    }
                                    disabled={step !== 3}
                                  />
                                ) : (
                                  <span className="ml-auto text-red-500 font-bold">
                                    {t('steps.step3.notFound')}
                                  </span>
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
                            {t('steps.step3.next')}
                          </Button>
                        </>
                      )}
                    </>
                  )
                if (contentIdx === 3)
                  return (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xl tracking-wider text-black">
                          {t('steps.step4.title')}
                        </span>
                        {playlistUrl && (
                          <span className="text-green-700 font-bold">
                            {t('steps.step4.done')}
                          </span>
                        )}
                      </div>
                      <p className="text-base text-neutral-700 mb-4 font-mono">
                        {t('steps.step4.description')}
                      </p>
                      <Input
                        className="mb-2 border-2 border-black rounded bg-white"
                        value={playlistName}
                        onChange={(e) => setPlaylistName(e.target.value)}
                        placeholder={t('steps.step4.placeholder')}
                        disabled={step !== 4}
                      />
                      <Button
                        variant="neutral"
                        onClick={handleCreatePlaylist}
                        disabled={
                          isLoading ||
                          !spotifyToken ||
                          spotifyTracks.filter(
                            (t) =>
                              t.found &&
                              t.id &&
                              selectedTrackIds.includes(t.id),
                          ).length === 0 ||
                          step !== 4
                        }
                        className="w-full"
                      >
                        {isLoading && step === 4
                          ? t('steps.step4.creating')
                          : t('steps.step4.button')}
                      </Button>
                      {playlistUrl && (
                        <div className="mt-4 flex flex-col items-center gap-2">
                          {playlistMeta?.cover && (
                            <a
                              href={playlistMeta.playlistUrl || playlistUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={playlistMeta.cover}
                                alt={t('common.playlistCover')}
                                className="w-32 h-32 rounded shadow border-2 border-black mb-2"
                              />
                            </a>
                          )}
                          <div className="text-lg font-bold text-center">
                            <a
                              href={playlistMeta?.playlistUrl || playlistUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {playlistMeta?.name || playlistName}
                            </a>
                          </div>
                          <div className="text-sm text-neutral-700 text-center">
                            {t('steps.step4.by')}{' '}
                            {playlistMeta?.ownerUrl ? (
                              <a
                                href={playlistMeta.ownerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                {playlistMeta.ownerName}
                              </a>
                            ) : (
                              playlistMeta?.ownerName
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )
                return null
              })()}
              {/* Neo-brutalism Progress Bar (2,3단계 로딩 중) */}
              {isLoading && (step === 2 || step === 3) && (
                <div className="absolute left-0 right-0 bottom-0 px-8 pb-8 z-40">
                  <Progress
                    value={70}
                    className="w-full h-6 border-4 border-black rounded-none shadow-[2px_2px_0_0_#222] bg-yellow-200"
                  />
                  <div
                    className="text-center text-xs font-bold mt-1 text-black"
                    style={{ textShadow: '1px 1px 0 #fff' }}
                  >
                    Loading...
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
