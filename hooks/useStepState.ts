import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export function useStepState({
  spotifyToken,
  isExtracted,
  isSearched,
  t,
  setIsExtracted,
  setIsSearched,
}: {
  spotifyToken: string | null
  isExtracted: boolean
  isSearched: boolean
  t: (key: string) => string
  setIsExtracted: (v: boolean) => void
  setIsSearched: (v: boolean) => void
}) {
  const [step, setStep] = useState<number>(1)

  // 단계 이동 함수
  const goToStep = useCallback(
    (target: number) => {
      const next = Math.max(1, Math.min(4, target))
      if (next === 1) {
        setStep(next)
        return
      }
      if (next > 1 && !spotifyToken) {
        toast.error(t('errors.authenticateFirst'))
        return
      }
      if (next > 2 && !isExtracted) {
        toast.error(t('errors.extractFirst'))
        return
      }
      if (next > 3 && !isSearched) {
        toast.error(t('errors.searchFirst'))
        return
      }
      setStep(next)
      if (next < 2) setIsExtracted(false)
      if (next < 3) setIsSearched(false)
    },
    [spotifyToken, isExtracted, isSearched, t, setIsExtracted, setIsSearched],
  )

  return {
    step,
    setStep,
    goToStep,
  }
}
