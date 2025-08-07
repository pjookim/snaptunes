import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface SongInfo {
  title: string
  artist?: string
}

interface Step2OcrCardProps {
  t: (key: string) => string
  step: number
  text: string
  setText: (text: string) => void
  isLoading: boolean
  ocrResult: SongInfo[]
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleExtractSongs: (overrideText?: string) => Promise<void>
  isExtracted: boolean
  goToStep: (step: number) => void
}

const Step2OcrCard: React.FC<Step2OcrCardProps> = ({
  t,
  step,
  text,
  setText,
  isLoading,
  ocrResult,
  handleImageUpload,
  handleExtractSongs,
  isExtracted,
  goToStep,
}) => {
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
      {!isLoading && step === 2 && (
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
  )
}

export default Step2OcrCard 