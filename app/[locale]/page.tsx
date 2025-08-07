'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import {
  searchSongsInSpotify,
  createSpotifyPlaylist,
  SpotifyTrack,
  CreatedPlaylistInfo,
} from '../spotify-api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ThemeToggle from '@/components/ThemeToggle'
import Step1AuthCard from '@/components/Step1AuthCard'
import Step2OcrCard from '@/components/Step2OcrCard'
import Step3SearchCard from '@/components/Step3SearchCard'
import Step4PlaylistCard from '@/components/Step4PlaylistCard'
import { refreshSpotifyToken, getSpotifyUserInfo } from '@/lib/api/spotify'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { useOcrState } from '@/hooks/useOcrState'
import { useStepState } from '@/hooks/useStepState'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useCardAnimation } from '@/hooks/useCardAnimation'
import { NEO_CARD_COLORS } from '@/lib/constants/neo-color'

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

export default function Home() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const {
    image,
    setImage,
    text,
    setText,
    ocrResult,
    setOcrResult,
    isExtracted,
    setIsExtracted,
    isLoading,
    setIsLoading,
    handleImageUpload,
    handleExtractSongs,
  } = useOcrState(t)
  const {
    spotifyToken,
    setSpotifyToken,
    spotifyUser,
    setSpotifyUser,
    getValidSpotifyToken,
    handleSpotifyAuth,
    handleSpotifyLogout,
  } = useSpotifyAuth()
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([])
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([])
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null)
  const [playlistName, setPlaylistName] = useState(t('defaults.playlistName'))
  const [isSearched, setIsSearched] = useState(false)
  const { step, setStep, goToStep } = useStepState({
    spotifyToken,
    isExtracted,
    isSearched,
    t,
    setIsExtracted,
    setIsSearched,
  })
  const [playlistMeta, setPlaylistMeta] = useState<CreatedPlaylistInfo | null>(
    null,
  )

  // 카드 내용 정의
  const stepCards = [
    {
      color: NEO_CARD_COLORS[0],
      content: (
        <Step1AuthCard
          t={t}
          spotifyToken={spotifyToken}
          spotifyUser={spotifyUser}
          handleSpotifyAuth={handleSpotifyAuth}
          handleSpotifyLogout={handleSpotifyLogout}
          goToStep={goToStep}
        />
      ),
      minHeight: 260,
    },
    {
      color: NEO_CARD_COLORS[1],
      content: (
        <Step2OcrCard
          t={t}
          step={step}
          text={text}
          setText={setText}
          isLoading={isLoading}
          ocrResult={ocrResult}
          handleImageUpload={handleImageUpload}
          handleExtractSongs={handleExtractSongs}
          isExtracted={isExtracted}
          goToStep={goToStep}
        />
      ),
      minHeight: 340,
    },
    {
      color: NEO_CARD_COLORS[2],
      content: (
        <Step3SearchCard
          t={t}
          step={step}
          spotifyTracks={spotifyTracks}
          selectedTrackIds={selectedTrackIds}
          handleTrackCheckbox={handleTrackCheckbox}
          isSearched={isSearched}
          goToStep={goToStep}
        />
      ),
      minHeight: 340,
    },
    {
      color: NEO_CARD_COLORS[3],
      content: (
        <Step4PlaylistCard
          t={t}
          step={step}
          playlistName={playlistName}
          setPlaylistName={setPlaylistName}
          isLoading={isLoading}
          spotifyToken={spotifyToken}
          spotifyTracks={spotifyTracks}
          selectedTrackIds={selectedTrackIds}
          handleCreatePlaylist={handleCreatePlaylist}
          playlistUrl={playlistUrl}
          playlistMeta={playlistMeta}
        />
      ),
      minHeight: 220,
    },
  ]
  const {
    reveal,
    cardColor,
    pendingColor,
    contentIdx,
    pendingIdx,
    cardHeight,
    contentRef,
    setCardHeight,
  } = useCardAnimation(step, stepCards)

  // Inkdrop 애니메이션: 카드 내용은 바뀌지 않고, 위에 원이 퍼진 뒤 내용/색/높이 변경
  useEffect(() => {
    if (contentIdx === step - 1) return
    setCardHeight(stepCards[step - 1].minHeight)
    const timeout1 = setTimeout(() => {}, 40)
    const timeout2 = setTimeout(() => {}, 640)
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

  const { isDark } = useDarkMode()

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
              {stepCards[contentIdx].content}
              {/* Neo-brutalism Progress Bar (2,3단계 로딩 중) */}
              {isLoading && (step === 2 || step === 3) && (
                <div className="w-full py-2 z-40">
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
