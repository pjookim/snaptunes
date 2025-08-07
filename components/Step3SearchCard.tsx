import React from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface SpotifyTrack {
  id: string
  title: string
  artist: string
  albumArt?: string
  found?: boolean // boolean | undefined 허용
}

interface Step3SearchCardProps {
  t: (key: string) => string
  step: number
  spotifyTracks: SpotifyTrack[]
  selectedTrackIds: string[]
  handleTrackCheckbox: (trackId: string) => void
  isSearched: boolean
  goToStep: (step: number) => void
}

const Step3SearchCard: React.FC<Step3SearchCardProps> = ({
  t,
  step,
  spotifyTracks,
  selectedTrackIds,
  handleTrackCheckbox,
  isSearched,
  goToStep,
}) => {
  return (
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