import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Progress } from '@/components/ui/progress'
import { SpotifyTrack } from '@/app/spotify-api'

interface Step3SearchCardProps {
  t: (key: string) => string
  step: number
  selectedPlatform: 'spotify' | 'apple-music' | 'youtube-music' | null
  tracks: SpotifyTrack[]
  selectedTrackIds: string[]
  handleTrackCheckbox: (trackId: string) => void
  isSearched: boolean
  goToStep: (step: number) => void
  isLoading?: boolean // 로딩 상태 추가
}

const Step3SearchCard: React.FC<Step3SearchCardProps> = ({
  t,
  step,
  selectedPlatform,
  tracks,
  selectedTrackIds,
  handleTrackCheckbox,
  isSearched,
  goToStep,
  isLoading = false,
}) => {
  const [searchProgress, setSearchProgress] = useState(0)
  const [searchStatus, setSearchStatus] = useState('')

  // Apple Music 검색 진행률 시뮬레이션 (실제로는 API에서 진행률을 받아와야 함)
  useEffect(() => {
    if (
      isLoading &&
      selectedPlatform === 'apple-music' &&
      tracks.length === 0
    ) {
      setSearchProgress(0)
      setSearchStatus('Apple Music 검색 준비 중...')

      // 진행률 시뮬레이션 (실제로는 API 응답에서 진행률을 받아와야 함)
      const interval = setInterval(() => {
        setSearchProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + Math.random() * 15
        })
      }, 1000)

      return () => clearInterval(interval)
    } else if (!isLoading && tracks.length > 0) {
      setSearchProgress(100)
      setSearchStatus('검색 완료!')
    }
  }, [isLoading, selectedPlatform, tracks.length])

  const getPlatformName = () => {
    if (selectedPlatform === 'spotify') {
      return 'Spotify'
    } else if (selectedPlatform === 'apple-music') {
      return 'Apple Music'
    } else if (selectedPlatform === 'youtube-music') {
      return 'YouTube Music'
    }
    return ''
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}초`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}분 ${remainingSeconds}초`
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-xl tracking-wider text-black">
          {t('steps.step3.title')} - {getPlatformName()}
        </span>
        {tracks.length > 0 && (
          <span className="text-green-700 font-bold">
            {t('steps.step3.done')}
          </span>
        )}
      </div>
      <p className="text-base text-neutral-700 mb-4 font-mono">
        {t('steps.step3.description')}
      </p>

      {/* Apple Music 검색 진행률 표시 */}
      {isLoading && selectedPlatform === 'apple-music' && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-blue-800">
              Apple Music 검색 진행률
            </span>
            <span className="text-sm text-blue-600">
              {Math.round(searchProgress)}%
            </span>
          </div>
          <Progress value={searchProgress} className="w-full h-3 bg-blue-100" />
          <div className="mt-2 text-sm text-blue-700">
            {searchStatus}
            {searchProgress > 0 && searchProgress < 100 && (
              <div className="mt-1">
                <span className="text-xs text-blue-500">
                  Apple Music API 응답 속도가 느려서 시간이 걸릴 수 있습니다...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {tracks.length > 0 && (
        <>
          <ul className="mt-4 space-y-2">
            {tracks.map((track, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-base w-full"
              >
                {/* 앨범 커버 */}
                {track.albumArt && (
                  <Image
                    width={48}
                    height={48}
                    src={track.albumArt}
                    alt={t('common.album')}
                    className="w-12 h-12 rounded border-2 border-black shrink-0 p-0.5"
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
  )
}

export default Step3SearchCard
