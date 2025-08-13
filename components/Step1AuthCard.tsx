import React from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import {
  Platform,
  SpotifyUser,
  YouTubeUser,
  AppleMusicUser,
  Step1AuthCardProps,
} from '@/types/auth'

function getPlatformLabel(p: Platform) {
  if (p === 'spotify') return 'Spotify'
  if (p === 'apple-music') return 'Apple Music'
  return 'YouTube Music'
}

export default function Step1AuthCard(props: Step1AuthCardProps) {
  const {
    t,
    selectedPlatform,
    onPlatformSelect,
    spotifyToken,
    spotifyUser,
    onSpotifyAuth,
    onSpotifyLogout,
    isAppleAuthorized,
    appleMusicUser,
    onAppleAuthorize,
    onAppleUnauthorize,
    youtubeToken,
    youtubeUser,
    onYouTubeAuth,
    onYouTubeLogout,
    goToStep,
  } = props

  const isAuthorizedForSelected = ((): boolean => {
    if (!selectedPlatform) return false
    if (selectedPlatform === 'spotify') return !!spotifyToken
    if (selectedPlatform === 'apple-music') return !!isAppleAuthorized
    if (selectedPlatform === 'youtube-music') return !!youtubeToken
    return false
  })()

  const handleAuth = () => {
    if (!selectedPlatform) return
    if (selectedPlatform === 'spotify') onSpotifyAuth()
    else if (selectedPlatform === 'apple-music') onAppleAuthorize()
    else onYouTubeAuth()
  }

  const handleLogout = () => {
    if (!selectedPlatform) return
    if (selectedPlatform === 'spotify') onSpotifyLogout()
    else if (selectedPlatform === 'apple-music') onAppleUnauthorize()
    else onYouTubeLogout()
    onPlatformSelect(null)
  }

  // 미선택 또는 미인증: 플랫폼 선택 그리드 표시
  if (!isAuthorizedForSelected) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          {t('steps.step1.description')}
        </p>

        {/* 플랫폼 선택 */}
        <div className="grid grid-rows-1 grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="default"
            className="flex flex-row md:flex-col bg-background justify-start md:justify-center items-center gap-2 h-auto py-4"
            onClick={() => {
              onPlatformSelect('spotify')
              onSpotifyAuth()
            }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
              <Image
                src="/spotify-logo.svg"
                alt="Spotify"
                width={48}
                height={48}
              />
            </div>
            <div className="text-left md:text-center">
              <div className="text-lg font-semibold text-foreground">
                Spotify
              </div>
              <div className="text-xs text-foreground/60 text-wrap">
                {t('Step1PlatformSelectionCard.spotifyDescription')}
              </div>
            </div>
          </Button>
          <Button
            variant="default"
            className="flex flex-row md:flex-col bg-background justify-start md:justify-center items-center gap-2 h-auto py-4"
            onClick={() => {
              onPlatformSelect('apple-music')
              onAppleAuthorize()
            }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
              <Image
                src="/applemusic-logo.svg"
                alt="Apple Music"
                width={48}
                height={48}
              />
            </div>
            <div className="text-left md:text-center">
              <div className="text-lg font-semibold text-foreground">
                Apple Music
              </div>
              <div className="text-xs text-foreground/60 text-wrap">
                {t('Step1PlatformSelectionCard.appleMusicDescription')}
              </div>
            </div>
          </Button>

          <Button
            variant="default"
            className="flex flex-row md:flex-col bg-background justify-start md:justify-center items-center gap-2 h-auto py-4"
            onClick={() => {
              onPlatformSelect('youtube-music')
              onYouTubeAuth()
            }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
              <Image
                src="/youtube-logo.svg"
                alt="YouTube"
                width={48}
                height={48}
              />
            </div>
            <div className="text-left md:text-center">
              <div className="text-lg font-semibold text-foreground">
                YouTube
              </div>
              <div className="text-xs text-foreground/60 text-wrap">
                {t('Step1PlatformSelectionCard.youtubeDescription')}
              </div>
            </div>
          </Button>
        </div>
      </div>
    )
  }

  const platformLogoSrc =
    selectedPlatform === 'spotify'
      ? '/spotify-logo.svg'
      : selectedPlatform === 'apple-music'
        ? '/applemusic-logo.svg'
        : '/youtube-logo.svg'

  const displayName =
    selectedPlatform === 'spotify'
      ? spotifyUser?.displayName || 'Spotify User'
      : selectedPlatform === 'youtube-music'
        ? youtubeUser?.displayName || 'YouTube Music User'
        : selectedPlatform === 'apple-music'
          ? appleMusicUser?.displayName || 'Apple Music User'
          : 'Unknown User'

  const email = selectedPlatform === 'spotify' ? spotifyUser?.email : undefined

  const profileImage =
    selectedPlatform === 'spotify'
      ? spotifyUser?.imageUrl
      : selectedPlatform === 'youtube-music'
        ? youtubeUser?.imageUrl
        : selectedPlatform === 'apple-music'
          ? appleMusicUser?.imageUrl
          : undefined

  return (
    <div className="space-y-4 p-4">
      <div className="bg-white border-2 border-black rounded-base shadow-[2px_2px_0_0_#222] p-4">
        <div className="flex items-center gap-3">
          {profileImage && (
            <Image
              width={48}
              height={48}
              src={profileImage}
              alt={t('common.profile')}
              className="w-12 h-12 rounded-full border-2 p-0.5 border-black"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <Image
                src={platformLogoSrc}
                alt={getPlatformLabel(selectedPlatform!)}
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="font-bold text-lg text-black">{displayName}</div>
            </div>
            {email && <div className="text-sm text-gray-600">{email}</div>}
            {selectedPlatform === 'apple-music' && appleMusicUser && (
              <div className="text-xs text-gray-500 space-y-1">
                {appleMusicUser.hasAppleMusicSubscription && (
                  <div>✓ Apple Music 구독자</div>
                )}
                {appleMusicUser.libraryPlaylistsCount !== undefined && (
                  <div>
                    플레이리스트: {appleMusicUser.libraryPlaylistsCount}개
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="destructive" className="flex-1" onClick={handleLogout}>
          {t('steps.step1.logout')}
        </Button>
        <Button className="flex-1" onClick={() => goToStep(2)}>
          {t('steps.step1.next')}
        </Button>
      </div>
    </div>
  )
}
