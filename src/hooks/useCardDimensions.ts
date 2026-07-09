import { useState, useEffect } from 'react'
import { computeCardWidth, computeColumnGap, CARD_ASPECT_RATIO } from '../constants'

const DESKTOP_DOWN_RATIO = 0.125
const DESKTOP_UP_RATIO = 0.344
const TOUCH_DOWN_RATIO = 0.375
const TOUCH_UP_RATIO = 0.45

export function useCardDimensions(widthOffset: number = 0) {
  const [viewportW, setViewportW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [viewportH, setViewportH] = useState(typeof window !== 'undefined' ? window.innerHeight : 768)
  const [isCoarse, setIsCoarse] = useState(false)

  useEffect(() => {
    const onResize = () => {
      setViewportW(window.innerWidth)
      setViewportH(window.innerHeight)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const mql = matchMedia('(pointer: coarse)')
    setIsCoarse(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsCoarse(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const effectiveW = viewportW - widthOffset
  const cardWidth = computeCardWidth(effectiveW)
  const cardHeight = cardWidth * (1 / CARD_ASPECT_RATIO)
  const columnGap = computeColumnGap(effectiveW)

  const faceDownRatio = isCoarse ? TOUCH_DOWN_RATIO : DESKTOP_DOWN_RATIO
  const faceUpRatio = isCoarse ? TOUCH_UP_RATIO : DESKTOP_UP_RATIO

  return {
    cardWidth,
    cardHeight,
    columnGap,
    faceDownOffset: Math.round(cardWidth * faceDownRatio),
    faceUpOffset: Math.round(cardWidth * faceUpRatio),
    halfWidth: Math.round(cardWidth / 2),
    halfHeight: Math.round(cardHeight / 2),
    viewportW,
    viewportH,
    isCoarse,
  }
}
