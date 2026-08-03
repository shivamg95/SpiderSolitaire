import { useEffect, useMemo, useState } from 'react'
import { lowMotionTween, springs, type MotionTransition } from './springs'

export interface MotionPreset {
  readonly reduced: boolean
  readonly snap: MotionTransition
  readonly deal: MotionTransition
  readonly flip: MotionTransition
  readonly panel: MotionTransition
  readonly celebrate: MotionTransition
  readonly fadeMs: number
}

const FULL: MotionPreset = {
  reduced: false,
  snap: springs.snap,
  deal: springs.deal,
  flip: springs.flip,
  panel: springs.panel,
  celebrate: springs.celebrate,
  fadeMs: 180,
}

const LOW: MotionPreset = {
  reduced: true,
  snap: lowMotionTween,
  deal: lowMotionTween,
  flip: lowMotionTween,
  panel: lowMotionTween,
  celebrate: lowMotionTween,
  fadeMs: 80,
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function resolveMotionPreset(forceReduced: boolean): MotionPreset {
  return forceReduced || prefersReducedMotion() ? LOW : FULL
}

export function useMotionPreset(reducedMotionSetting = false): MotionPreset {
  const [systemReduced, setSystemReduced] = useState(prefersReducedMotion)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => {
      setSystemReduced(mq.matches)
    }
    onChange()
    mq.addEventListener('change', onChange)
    return () => {
      mq.removeEventListener('change', onChange)
    }
  }, [])

  return useMemo(
    () => resolveMotionPreset(reducedMotionSetting || systemReduced),
    [reducedMotionSetting, systemReduced],
  )
}
