'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useParams } from 'next/navigation'
import {
  searchSongsInSpotify,
  createSpotifyPlaylist,
  SpotifyTrack,
  CreatedPlaylistInfo,
} from '../spotify-api'
import {
  searchSongsInAppleMusic,
  createAppleMusicPlaylist,
  AppleMusicTrack,
} from '../apple-music-api'
import {
  searchSongsInYouTubeMusic,
  createYouTubeMusicPlaylist,
  YouTubeMusicTrack,
} from '../youtube-music-api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ThemeToggle from '@/components/ThemeToggle'
import Step1AuthCard from '@/components/Step1AuthCard'
import Step2ExtractCard from '@/components/Step2ExtractCard'
import Step3SearchCard from '@/components/Step3SearchCard'
import Step4PlaylistCard from '@/components/Step4PlaylistCard'
import { getSpotifyUserInfo } from '@/lib/api/spotify'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { useAppleMusicAuth } from '@/hooks/useAppleMusicAuth'
import { useYouTubeMusicAuth } from '@/hooks/useYouTubeMusicAuth'
import { useOcrState } from '@/hooks/useOcrState'
import { useStepState } from '@/hooks/useStepState'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useCardAnimation } from '@/hooks/useCardAnimation'
import { NEO_CARD_COLORS } from '@/lib/constants/neo-color'
import Link from 'next/link'
import Image from 'next/image'
import { PLATFORMS, Platform } from '@/types/state'

// 통합된 트랙 타입 정의
type Track = SpotifyTrack | AppleMusicTrack | YouTubeMusicTrack

function getAccessTokenFromUrl(): { spotify?: string; youtube?: string } {
  if (typeof window === 'undefined') return {}
  const url = new URL(window.location.href)
  return {
    spotify: url.searchParams.get('spotify_access_token') || undefined,
    youtube: url.searchParams.get('youtube_access_token') || undefined,
  }
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

export default function Home() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const params = useParams()
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
    imageData,
    setImageData,
    playlistTitle,
    setPlaylistTitle,
    handleImageUpload,
    handleImageUploadV2,
    handleExtractSongs,
    handleExtractSongsV2,
  } = useOcrState(t)
  const {
    spotifyToken,
    setSpotifyToken,
    spotifyUser,
    setSpotifyUser,
    getValidSpotifyToken,
    handleSpotifyAuth,
    handleSpotifyLogout,
    clearSpotifyTokens,
  } = useSpotifyAuth()
  const {
    isAuthorized: isAppleMusicAuthorized,
    getAccessToken,
    authorize: authorizeAppleMusic,
    userInfo: appleMusicUser,
  } = useAppleMusicAuth()
  const {
    youtubeToken,
    setYouTubeToken,
    youtubeUser,
    setYouTubeUser,
    getValidYouTubeToken,
    getYouTubeUserInfo,
    clearYouTubeTokens,
  } = useYouTubeMusicAuth()
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null,
  )

  function saveSelectedPlatform(platform: Platform) {
    try {
      localStorage.setItem('snaptunes_platform', platform)
    } catch {}
  }

  function loadSelectedPlatform(): Platform | null {
    try {
      const v = localStorage.getItem('snaptunes_platform')
      if (
        v === PLATFORMS.SPOTIFY ||
        v === PLATFORMS.APPLE_MUSIC ||
        v === PLATFORMS.YOUTUBE_MUSIC
      )
        return v as Platform
      return null
    } catch {
      return null
    }
  }

  const handlePlatformSelect = (p: Platform) => {
    setSelectedPlatform(p)
    saveSelectedPlatform(p)
    // 플랫폼 선택 즉시 인증 시작
    if (p === PLATFORMS.SPOTIFY) {
      handleSpotifyAuth()
    } else if (p === PLATFORMS.APPLE_MUSIC) {
      authorizeAppleMusic()
    }
  }

  const handlePlatformReset = () => {
    setSelectedPlatform(null)
    try {
      localStorage.removeItem('snaptunes_platform')
    } catch {}
  }
  const [tracks, setTracks] = useState<Track[]>([])
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([])
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null)
  const [playlistName, setPlaylistName] = useState(t('defaults.playlistName'))
  const [isSearched, setIsSearched] = useState(false)

  // playlistTitle이 있을 때 playlistName 업데이트
  useEffect(() => {
    if (playlistTitle) {
      setPlaylistName(playlistTitle)
    }
  }, [playlistTitle])
  const isAnyServiceAuthorized =
    selectedPlatform === PLATFORMS.SPOTIFY
      ? !!spotifyToken
      : selectedPlatform === PLATFORMS.APPLE_MUSIC
        ? isAppleMusicAuthorized
        : selectedPlatform === PLATFORMS.YOUTUBE_MUSIC
          ? !!youtubeToken
          : false

  const { step, setStep, goToStep } = useStepState({
    isAuthorized: isAnyServiceAuthorized,
    isExtracted,
    isSearched,
    t,
    setIsExtracted,
    setIsSearched,
  })
  const [playlistMeta, setPlaylistMeta] = useState<CreatedPlaylistInfo | null>(
    null,
  )

  // step 변경을 추적하여 수동 이동인지 확인
  const customGoToStep = (targetStep: number) => {
    if (targetStep === 1) {
      setShouldAutoMoveToStep2(false)
    }
    goToStep(targetStep)
  }

  // 카드 내용 정의
  const stepCards = [
    {
      color: NEO_CARD_COLORS[0],
      content: (
        <Step1AuthCard
          t={t}
          selectedPlatform={selectedPlatform}
          onPlatformSelect={(p) => {
            if (!p) {
              handlePlatformReset()
              return
            }
            handlePlatformSelect(p)
          }}
          spotifyToken={spotifyToken}
          spotifyUser={spotifyUser}
          onSpotifyAuth={handleSpotifyAuth}
          onSpotifyLogout={() => {
            handleSpotifyLogout()
            clearSpotifyTokens()
            handlePlatformReset()
          }}
          isAppleAuthorized={isAppleMusicAuthorized}
          appleMusicUser={appleMusicUser}
          onAppleAuthorize={authorizeAppleMusic}
          onAppleUnauthorize={() => {
            // Apple Music unauthorize는 훅 내부 제공 X: 선택만 초기화
            // Apple Music은 MusicKit을 사용하므로 별도 토큰 정리 불필요
            handlePlatformReset()
          }}
          youtubeToken={youtubeToken}
          youtubeUser={youtubeUser}
          onYouTubeAuth={() => {
            // 리디렉션 인증
            window.location.href = '/api/auth/youtube-music'
          }}
          onYouTubeLogout={() => {
            // YouTube 훅에서 토큰 제거 처리
            setYouTubeToken(null)
            setYouTubeUser(null)
            clearYouTubeTokens()
            handlePlatformReset()
          }}
          goToStep={customGoToStep}
        />
      ),
      minHeight: 260,
    },
    {
      color: NEO_CARD_COLORS[1],
      content: (
        <Step2ExtractCard
          t={t}
          step={step}
          text={text}
          setText={setText}
          isLoading={isLoading}
          ocrResult={ocrResult}
          handleImageUpload={handleImageUpload}
          handleImageUploadV2={handleImageUploadV2}
          handleExtractSongs={handleExtractSongs}
          handleExtractSongsV2={handleExtractSongsV2}
          isExtracted={isExtracted}
          goToStep={customGoToStep}
          imageData={imageData}
          image={image}
          setImage={setImage}
          setImageData={setImageData}
          locale={typeof params.locale === 'string' ? params.locale : 'en'}
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
          selectedPlatform={selectedPlatform}
          tracks={tracks}
          selectedTrackIds={selectedTrackIds}
          handleTrackCheckbox={handleTrackCheckbox}
          isSearched={isSearched}
          goToStep={customGoToStep}
          isLoading={isLoading}
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
          selectedPlatform={selectedPlatform}
          playlistName={playlistName}
          setPlaylistName={setPlaylistName}
          isLoading={isLoading}
          isAuthorized={
            selectedPlatform === PLATFORMS.SPOTIFY
              ? !!spotifyToken
              : selectedPlatform === PLATFORMS.APPLE_MUSIC
                ? isAppleMusicAuthorized
                : selectedPlatform === PLATFORMS.YOUTUBE_MUSIC
                  ? !!youtubeToken
                  : false
          }
          tracks={tracks}
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
  }, [contentIdx, ocrResult.length, tracks.length, playlistUrl])

  // 토큰 관리 (Spotify & YouTube Music)
  useEffect(() => {
    const initializeTokens = async () => {
      // 0. 선택된 플랫폼 복원
      const savedPlatform = loadSelectedPlatform()
      if (savedPlatform) setSelectedPlatform(savedPlatform)

      // 1. URL에서 토큰 확인 (새로운 인증)
      const urlTokens = getAccessTokenFromUrl()
      const url = new URL(window.location.href)

      // Spotify 토큰 처리
      if (urlTokens.spotify) {
        const urlRefreshToken = url.searchParams.get('spotify_refresh_token')
        if (urlRefreshToken) {
          // Spotify 훅에서 자동으로 처리되므로 토큰만 설정
          setSpotifyToken(urlTokens.spotify)
          saveSelectedPlatform(PLATFORMS.SPOTIFY)
          setSelectedPlatform(PLATFORMS.SPOTIFY)
          setShouldAutoMoveToStep2(true)
        }
      }

      // YouTube Music 토큰 처리
      if (urlTokens.youtube) {
        const urlRefreshToken = url.searchParams.get('youtube_refresh_token')
        if (urlRefreshToken) {
          // YouTube 훅에서 자동으로 처리되므로 토큰만 설정
          setYouTubeToken(urlTokens.youtube)
          saveSelectedPlatform(PLATFORMS.YOUTUBE_MUSIC)
          setSelectedPlatform(PLATFORMS.YOUTUBE_MUSIC)
          setShouldAutoMoveToStep2(true)
        }
      }

      // URL에서 토큰들이 있으면 제거
      if (urlTokens.spotify || urlTokens.youtube) {
        url.searchParams.delete('spotify_access_token')
        url.searchParams.delete('spotify_refresh_token')
        url.searchParams.delete('youtube_access_token')
        url.searchParams.delete('youtube_refresh_token')
        window.history.replaceState({}, document.title, url.toString())
        return
      }
    }

    initializeTokens()
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

  // 토큰이 설정될 때 사용자 정보 가져오기
  useEffect(() => {
    const fetchSpotifyUserInfo = async () => {
      if (spotifyToken) {
        const userInfo = await getSpotifyUserInfo(spotifyToken)
        setSpotifyUser(userInfo)
      } else {
        setSpotifyUser(null)
      }
    }

    fetchSpotifyUserInfo()
  }, [spotifyToken])

  useEffect(() => {
    const fetchYouTubeUserInfo = async () => {
      if (youtubeToken) {
        const userInfo = await getYouTubeUserInfo(youtubeToken)
        setYouTubeUser(userInfo)
      } else {
        setYouTubeUser(null)
      }
    }

    fetchYouTubeUserInfo()
  }, [youtubeToken])

  // 음악 서비스에서 곡 검색
  async function handleSearchMusic() {
    if (!selectedPlatform) {
      toast.error('음악 서비스를 선택해주세요')
      return
    }

    if (ocrResult.length === 0) {
      toast.error(t('errors.noSongTitles'))
      return
    }

    setIsLoading(true)
    setTracks([])
    setPlaylistUrl(null)
    setSelectedTrackIds([])
    setIsSearched(false)

    try {
      if (selectedPlatform === PLATFORMS.SPOTIFY) {
        const validToken = await getValidSpotifyToken(setSpotifyToken)
        if (!validToken) {
          toast.error(t('errors.spotifyAuthRequired'))
          return
        }
        const tracks = await searchSongsInSpotify(ocrResult, validToken)
        setTracks(tracks)
        setSelectedTrackIds(
          tracks.filter((t) => t.found && t.id).map((t) => t.id),
        )
      } else if (selectedPlatform === PLATFORMS.APPLE_MUSIC) {
        const accessToken = await getAccessToken()
        if (!accessToken) {
          toast.error(t('errors.appleMusicAuthRequired'))
          return
        }
        const tracks = await searchSongsInAppleMusic(ocrResult, accessToken)
        setTracks(tracks)
        setSelectedTrackIds(
          tracks.filter((t) => t.found && t.id).map((t) => t.id),
        )
      } else if (selectedPlatform === PLATFORMS.YOUTUBE_MUSIC) {
        const validToken = await getValidYouTubeToken(setYouTubeToken)
        if (!validToken) {
          toast.error(t('errors.youtubeMusicAuthRequired'))
          return
        }
        const tracks = await searchSongsInYouTubeMusic(ocrResult, validToken)
        setTracks(tracks)
        setSelectedTrackIds(
          tracks.filter((t) => t.found && t.id).map((t) => t.id),
        )
      }
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
      handleSearchMusic()
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

  // 플레이리스트 생성
  async function handleCreatePlaylist() {
    if (!selectedPlatform) {
      toast.error('음악 서비스를 선택해주세요')
      return
    }

    const foundTracks = tracks
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
      if (selectedPlatform === PLATFORMS.SPOTIFY) {
        const validToken = await getValidSpotifyToken(setSpotifyToken)
        if (!validToken) {
          toast.error(t('errors.spotifyAuthRequired'))
          return
        }
        const meta = await createSpotifyPlaylist(
          foundTracks,
          validToken,
          playlistName || t('defaults.playlistName'),
        )
        if (meta) {
          setPlaylistUrl(meta.playlistUrl)
          setPlaylistMeta(meta)
        }
      } else if (selectedPlatform === PLATFORMS.APPLE_MUSIC) {
        const accessToken = await getAccessToken()
        if (!accessToken) {
          toast.error(t('errors.appleMusicAuthRequired'))
          return
        }
        const meta = await createAppleMusicPlaylist(
          foundTracks,
          accessToken,
          playlistName || t('defaults.playlistName'),
        )
        if (meta) {
          setPlaylistUrl(meta.playlistUrl)
          setPlaylistMeta(meta)
        }
      } else if (selectedPlatform === PLATFORMS.YOUTUBE_MUSIC) {
        const validToken = await getValidYouTubeToken(setYouTubeToken)
        if (!validToken) {
          toast.error(t('errors.youtubeMusicAuthRequired'))
          return
        }
        const meta = await createYouTubeMusicPlaylist(
          foundTracks,
          validToken,
          playlistName || t('defaults.playlistName'),
        )
        if (meta) {
          setPlaylistUrl(meta.playlistUrl)
          setPlaylistMeta(meta)
        }
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

  // 인증 성공 직후에만 자동으로 Step 2로 이동
  const [shouldAutoMoveToStep2, setShouldAutoMoveToStep2] = useState(false)

  useEffect(() => {
    if (step === 1 && isAnyServiceAuthorized && shouldAutoMoveToStep2) {
      goToStep(2)
      setShouldAutoMoveToStep2(false)
    }
  }, [isAnyServiceAuthorized, step, goToStep, shouldAutoMoveToStep2])

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
      <div className="w-full max-w-2xl flex flex-col items-center gap-6 md:gap-8 my-6">
        <div className="flex flex-col items-center max-w-32 mx-auto md:max-w-md">
          <Image
            src={isDark ? '/snaptunes_logo_dark.svg' : '/snaptunes_logo.svg'}
            alt={t('app.logo')}
            width={200}
            height={200}
            priority
          />
        </div>
        {/* Step Indicator & Navigation (카드 위) */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="default"
            size="icon"
            onClick={() => customGoToStep(step - 1)}
            disabled={step === 1}
            aria-label={t('navigation.previous')}
          >
            <ChevronLeft size={32} strokeWidth={4} />
          </Button>
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => customGoToStep(s)}
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
            onClick={() => customGoToStep(step + 1)}
            disabled={
              step === stepCards.length ||
              (step === 1 && !isAnyServiceAuthorized) ||
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
          className="relative flex items-start justify-center w-full mb-8"
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
            <div className="relative z-30 px-4 py-4 md:px-8" ref={contentRef}>
              {stepCards[contentIdx].content}
              {/* Neo-brutalism Progress Bar (2,3단계 로딩 중) */}
              {isLoading && (step === 2 || step === 3) && (
                <div className="w-full py-1 z-40">
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
      {/* 개인정보처리방침 및 이용약관 링크 - 첫 번째 스텝에서만 활성화 */}
      {step === 1 && (
        <div className="w-full flex justify-center gap-2 text-sm">
          <Link
            href={`/${params.locale}/privacy`}
            className="font-bold hover:underline"
          >
            {t('privacy.title')}
          </Link>
          {' | '}
          <Link
            href={`/${params.locale}/terms`}
            className="font-bold hover:underline"
          >
            {t('terms.title')}
          </Link>
        </div>
      )}
    </main>
  )
}
