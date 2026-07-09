import { useState, useEffect } from 'react'
import { computeCardWidth, CARD_ASPECT_RATIO } from '../constants'

const DESKTOP_DOWN_RATIO = 0.125
const DESKTOP_UP_RATIO = 0.344
const TOUCH_DOWN_RATIO = 0.375
const TOUCH_UP_RATIO = 0.45

export function useCardDimensions() {
  const [viewportW, setViewportW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [isCoarse, setIsCoarse] = useState(false)

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth)
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

  const cardWidth = computeCardWidth(viewportW)
  const cardHeight = cardWidth * (1 / CARD_ASPECT_RATIO)

  const faceDownRatio = isCoarse ? TOUCH_DOWN_RATIO : DESKTOP_DOWN_RATIO
  const faceUpRatio = isCoarse ? TOUCH_UP_RATIO : DESKTOP_UP_RATIO

  return {
    cardWidth,
    cardHeight,
    faceDownOffset: Math.round(cardWidth * faceDownRatio),
    faceUpOffset: Math.round(cardWidth * faceUpRatio),
    halfWidth: Math.round(cardWidth / 2),
    halfHeight: Math.round(cardHeight / 2),
  }
}
