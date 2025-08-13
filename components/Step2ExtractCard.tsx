import React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ImageDropzone from './ImageDropzone'
import { SongInfo } from '@/types/song'

interface Step2ExtractCardProps {
  t: (key: string) => string
  step: number
  text: string
  setText: (text: string) => void
  isLoading: boolean
  ocrResult: SongInfo[]
  handleImageUpload: (file: File) => void
  handleImageUploadV2: (file: File) => void
  handleExtractSongs: (overrideText?: string) => Promise<void>
  handleExtractSongsV2: (locale: string) => Promise<void>
  isExtracted: boolean
  goToStep: (step: number) => void
  imageData: string | null
  image: File | null
  setImage: (image: File | null) => void
  setImageData: (imageData: string | null) => void
  locale: string
}

const Step2ExtractCard: React.FC<Step2ExtractCardProps> = ({
  t,
  step,
  text,
  setText,
  isLoading,
  ocrResult,
  handleImageUpload,
  handleImageUploadV2,
  handleExtractSongs,
  handleExtractSongsV2,
  isExtracted,
  goToStep,
  imageData,
  image,
  setImage,
  setImageData,
  locale,
}) => {
  return (
    <>
      <Tabs defaultValue="v2" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="v1">{t('steps.step2.tabV1')}</TabsTrigger>
          <TabsTrigger value="v2">{t('steps.step2.tabV2')}</TabsTrigger>
        </TabsList>

        <TabsContent value="v1" className="mt-4">
          {/* V1 제목과 설명 */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl tracking-wider text-black">
              {t('steps.step2.titleV1')}
            </span>
            {ocrResult.length > 0 && (
              <span className="text-green-700 font-bold">
                {t('steps.step2.done')}
              </span>
            )}
          </div>
          <p className="text-base text-neutral-700 mb-4 font-mono">
            {t('steps.step2.descriptionV1')}
          </p>

          {/* V1 기존 방식 */}
          <div className="mb-4">
            <ImageDropzone
              onImageSelect={handleImageUpload}
              onImageRemove={() => {
                // V1에서는 이미지 제거 시 이미지와 텍스트 모두 초기화
                setImage(null)
                setImageData(null)
                setText('')
              }}
              selectedImage={image ? URL.createObjectURL(image) : null}
              disabled={step !== 2}
              t={t}
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
        </TabsContent>

        <TabsContent value="v2" className="mt-4">
          {/* V2 제목과 설명 */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl tracking-wider text-black">
              {t('steps.step2.titleV2')}
            </span>
            {ocrResult.length > 0 && (
              <span className="text-green-700 font-bold">
                {t('steps.step2.done')}
              </span>
            )}
          </div>
          <p className="text-base text-neutral-700 mb-4 font-mono">
            {t('steps.step2.descriptionV2')}
          </p>

          {/* V2 GPT Vision 방식 */}
          <div className="mb-4">
            <ImageDropzone
              onImageSelect={handleImageUploadV2}
              onImageRemove={() => {
                // V2에서는 이미지 제거 시 imageData만 초기화
                // 텍스트는 유지
                setImage(null)
                setImageData(null)
              }}
              selectedImage={imageData}
              disabled={step !== 2}
              t={t}
            />
          </div>
          <Textarea
            className="mb-4 bg-white"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('steps.step2.placeholderV2')}
            disabled={step !== 2}
          />
          {!isLoading && step === 2 && (
            <Button
              variant="neutral"
              onClick={() => {
                console.log(
                  '[Step2OcrCard] V2 button clicked with locale:',
                  locale,
                )
                handleExtractSongsV2(locale)
              }}
              disabled={isLoading || (!imageData && !text.trim()) || step !== 2}
              className="w-full"
            >
              {t('steps.step2.buttonV2')}
            </Button>
          )}
        </TabsContent>
      </Tabs>

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

export default Step2ExtractCard
