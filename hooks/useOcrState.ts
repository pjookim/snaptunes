import { useState } from 'react'
import { SongInfo, APIResponse } from '@/types/song'
import { toast } from 'sonner'

// 곡명 추출 함수
async function extractSongTitlesFromText(
  text: string,
): Promise<{ songs: SongInfo[]; playlist_title: string }> {
  console.log('[Client] 곡명 추출 요청 시작', { textLength: text.length })

  try {
    const res = await fetch('/api/extract-songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      const errorData = (await res.json()) as APIResponse
      console.error('[Client] API 요청 실패:', {
        status: res.status,
        statusText: res.statusText,
        error: errorData.error,
      })
      throw new Error(errorData.error || 'API 요청이 실패했습니다.')
    }

    const data = (await res.json()) as APIResponse

    if (!data.songs) {
      console.error('[Client] 잘못된 API 응답:', data)
      throw new Error('API 응답 형식이 잘못되었습니다.')
    }

    console.log('[Client] 곡명 추출 성공:', {
      songCount: data.songs.length,
      songs: data.songs,
      playlist_title: data.playlist_title,
    })

    return { songs: data.songs, playlist_title: data.playlist_title || '' }
  } catch (error) {
    console.error('[Client] 곡명 추출 오류:', error)
    throw error
  }
}

export function useOcrState(t: (key: string) => string) {
  const [image, setImage] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [ocrResult, setOcrResult] = useState<SongInfo[]>([])
  const [isExtracted, setIsExtracted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [imageData, setImageData] = useState<string | null>(null)
  const [playlistTitle, setPlaylistTitle] = useState<string>('')

  // 이미지 업로드 핸들러 (OCR 적용, tesseract.js를 동적 import)
  async function handleImageUpload(file: File) {
    setImage(file)
    setIsLoading(true)
    try {
      const Tesseract = (await import('tesseract.js')).default
      const result = await Tesseract.recognize(file, 'eng+kor')
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

  // V2 이미지 업로드 핸들러 (GPT Vision용)
  async function handleImageUploadV2(file: File) {
    setImage(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setImageData(result)
    }
    reader.readAsDataURL(file)
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

  // V2 곡명 추출 (GPT Vision)
  async function handleExtractSongsV2(locale: string = 'en') {
    if (!imageData && !text.trim()) {
      toast.error('이미지나 텍스트를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setOcrResult([])
    setIsExtracted(false)

    try {
      console.log('[useOcrState] V2 extraction request:', {
        locale,
        hasImage: !!imageData,
        hasText: !!text.trim(),
      })
      const response = await fetch('/api/extract-songs-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim() || '',
          image: imageData,
          inputType: imageData ? 'image' : 'text',
          locale: locale,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to extract songs')
      }

      const data = await response.json()

      if (data.songs && Array.isArray(data.songs)) {
        setOcrResult(data.songs)
        setIsExtracted(true)
        // API에서 반환된 playlist_title 저장
        if (data.playlist_title) {
          setPlaylistTitle(data.playlist_title)
        }
        if (data.songs.length === 0) {
          toast.warning('추출된 곡이 없습니다.')
        } else {
          toast.success(`${data.songs.length}개의 곡을 찾았습니다.`)
        }
      } else {
        setOcrResult([])
        setIsExtracted(false)
        toast.warning('추출된 곡이 없습니다.')
      }
    } catch (error) {
      console.error('V2 extraction error:', error)
      toast.error('곡 추출에 실패했습니다.')
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
    imageData,
    setImageData,
    playlistTitle,
    setPlaylistTitle,
    handleImageUpload,
    handleImageUploadV2,
    handleExtractSongs,
    handleExtractSongsV2,
  }
}
