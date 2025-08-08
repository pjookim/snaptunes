import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface Step1AuthCardProps {
  t: (key: string) => string
  spotifyToken: string | null
  spotifyUser: {
    id: string
    displayName: string
    email: string
    imageUrl?: string
  } | null
  handleSpotifyAuth: () => void
  handleSpotifyLogout: () => void
  goToStep: (step: number) => void
}

const Step1AuthCard: React.FC<Step1AuthCardProps> = ({
  t,
  spotifyToken,
  spotifyUser,
  handleSpotifyAuth,
  handleSpotifyLogout,
  goToStep,
}) => {
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
          <div className="bg-white border-2 border-black rounded-base shadow-[2px_2px_0_0_#222] p-4">
            {/* 프로필 정보 */}
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
                <div className="flex items-center gap-1">
                  <Image
                    src="/spotify-logo.svg"
                    alt="Spotify"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <div className="font-bold text-lg text-black">
                    {spotifyUser.displayName}
                  </div>
                </div>
                <div className="text-sm text-gray-600">{spotifyUser.email}</div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleSpotifyLogout}
            >
              {t('steps.step1.logout')}
            </Button>
            <Button
              variant="neutral"
              className="flex-1"
              onClick={() => goToStep(2)}
              disabled={!spotifyToken}
            >
              {t('steps.step1.next')}
            </Button>
          </div>
        </div>
      ) : spotifyToken ? (
        <div className="space-y-2">
          <div className="bg-white border-2 border-black p-4 rounded-none shadow-[2px_2px_0_0_#222] text-center">
            <div className="text-sm text-gray-600">{t('common.loading')}</div>
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
}

export default Step1AuthCard
