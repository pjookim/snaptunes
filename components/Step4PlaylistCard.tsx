import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface PlaylistMeta {
  cover?: string | null
  playlistUrl?: string | null
  name: string
  ownerName?: string
  ownerUrl?: string | null
}

interface Track {
  id: string
  found?: boolean
}

interface Step4PlaylistCardProps {
  t: (key: string) => string
  step: number
  selectedPlatform: 'spotify' | 'apple-music' | 'youtube-music' | null
  playlistName: string
  setPlaylistName: (name: string) => void
  isLoading: boolean
  isAuthorized: boolean
  tracks: Track[]
  selectedTrackIds: string[]
  handleCreatePlaylist: () => Promise<void>
  playlistUrl: string | null
  playlistMeta: PlaylistMeta | null
}

const Step4PlaylistCard: React.FC<Step4PlaylistCardProps> = ({
  t,
  step,
  selectedPlatform,
  playlistName,
  setPlaylistName,
  isLoading,
  isAuthorized,
  tracks,
  selectedTrackIds,
  handleCreatePlaylist,
  playlistUrl,
  playlistMeta,
}) => {
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

  const foundTracks = tracks.filter(
    (t) => t.found && t.id && selectedTrackIds.includes(t.id),
  )

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-xl tracking-wider text-black">
          {t('steps.step4.title')} - {getPlatformName()}
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
      <div className="mb-4">
        <Input
          className="mb-2 border-2 border-black rounded bg-white"
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          placeholder={t('steps.step4.placeholder')}
          disabled={step !== 4}
        />
        {playlistName && playlistName !== t('defaults.playlistName') && (
          <div className="text-xs text-green-600 font-mono">
            {t('steps.step4.aiRecommended')}
          </div>
        )}
      </div>
      <Button
        variant="neutral"
        onClick={handleCreatePlaylist}
        disabled={
          isLoading || !isAuthorized || foundTracks.length === 0 || step !== 4
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
              <Image
                width={128}
                height={128}
                src={playlistMeta.cover}
                alt={t('common.playlistCover')}
                className="w-32 h-32 rounded shadow border-2 border-black mb-2 p-1"
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
}

export default Step4PlaylistCard
