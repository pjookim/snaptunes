import { useState, useEffect, useRef } from 'react'

export function useCardAnimation(
  step: number,
  stepCards: { color: string; minHeight: number }[],
) {
  const [reveal, setReveal] = useState(false)
  const [cardColor, setCardColor] = useState(stepCards[0].color)
  const [pendingColor, setPendingColor] = useState(stepCards[0].color)
  const [contentIdx, setContentIdx] = useState(0)
  const [pendingIdx, setPendingIdx] = useState(0)
  const [cardHeight, setCardHeight] = useState(stepCards[0].minHeight)
  const contentRef = useRef<HTMLDivElement>(null)

  // Inkdrop 애니메이션: 카드 내용은 바뀌지 않고, 위에 원이 퍼진 뒤 내용/색/높이 변경
  useEffect(() => {
    if (contentIdx === step - 1) return
    setPendingColor(stepCards[step - 1].color)
    setPendingIdx(step - 1)
    setCardColor(stepCards[step - 1].color)
    setContentIdx(step - 1)
    setCardHeight(stepCards[step - 1].minHeight)
    setReveal(false)
    const timeout1 = setTimeout(() => {
      setReveal(true)
    }, 40)
    const timeout2 = setTimeout(() => {
      setReveal(false)
    }, 640)
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
    }
  }, [step])

  // 카드 높이 자동 측정 (내용이 바뀔 때마다)
  useEffect(() => {
    if (contentRef.current) {
      setCardHeight(contentRef.current.offsetHeight + 32)
    }
  }, [contentIdx, stepCards, contentRef])

  return {
    reveal,
    cardColor,
    pendingColor,
    contentIdx,
    pendingIdx,
    cardHeight,
    contentRef,
    setCardHeight,
  }
}
