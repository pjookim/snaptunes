import { useState } from 'react'
import { extractSongTitlesFromText, SongInfo } from '@/app/ocr'
import { toast } from 'sonner'

export function useOcrState(t: (key: string) => string) {
  const [image, setImage] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [ocrResult, setOcrResult] = useState<SongInfo[]>([])
  const [isExtracted, setIsExtracted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 이미지 업로드 핸들러 (OCR 적용, tesseract.js를 동적 import)
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
      setIsLoading(true)
      try {
        const Tesseract = (await import('tesseract.js')).default
        const result = await Tesseract.recognize(e.target.files[0], 'eng+kor')
        const text: string =
          (result as { data: { text: string } }).data?.text ?? ''
        setText(text)
        await handleExtractSongs(text)
      } catch (err) {
        toast.error(t('errors.imageExtractionFailed'))
      } finally {
        setIsLoading(false)
      }
    }
  }

  // 곡명 추출 (ocrText 인자 허용)
  async function handleExtractSongs(overrideText?: string) {
    const inputText = overrideText ?? text
    if (!inputText.trim()) {
      toast.error(t('errors.enterText'))
      return
    }
    setIsLoading(true)
    setOcrResult([])
    setIsExtracted(false)
    try {
      const { songs, playlist_title } =
        await extractSongTitlesFromText(inputText)
      setOcrResult(songs)
      setIsExtracted(true)
      if (songs.length === 0) {
        toast.warning(t('errors.noSongsExtracted'))
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('errors.extractionFailed'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return {
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
  }
}
