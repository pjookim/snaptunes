import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface PlaylistMeta {
  cover?: string | null
  playlistUrl?: string | null
  name: string
  ownerName?: string
  ownerUrl?: string | null
}

interface SpotifyTrack {
  id: string
  found?: boolean
}

interface Step4PlaylistCardProps {
  t: (key: string) => string
  step: number
  playlistName: string
  setPlaylistName: (name: string) => void
  isLoading: boolean
  spotifyToken: string | null
  spotifyTracks: SpotifyTrack[]
  selectedTrackIds: string[]
  handleCreatePlaylist: () => Promise<void>
  playlistUrl: string | null
  playlistMeta: PlaylistMeta | null
}

const Step4PlaylistCard: React.FC<Step4PlaylistCardProps> = ({
  t,
  step,
  playlistName,
  setPlaylistName,
  isLoading,
  spotifyToken,
  spotifyTracks,
  selectedTrackIds,
  handleCreatePlaylist,
  playlistUrl,
  playlistMeta,
}) => {
  return (
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
        variant="neutral"
        onClick={handleCreatePlaylist}
        disabled={
          isLoading ||
          !spotifyToken ||
          spotifyTracks.filter(
            (t) => t.found && t.id && selectedTrackIds.includes(t.id),
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
}

export default Step4PlaylistCard 