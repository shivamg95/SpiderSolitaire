import { useMemo } from 'react'
import { motion } from 'motion/react'
import type { Suit } from '@/engine/types'
import { SuitGlyph } from '@/components/cards/suits'
import './FoundationBurst.css'

export const BURST_MS = 1100

const PARTICLE_COUNT = 12

export interface FoundationBurstProps {
  /** Changes on every completed set so the burst remounts and replays. */
  readonly burstKey: number
  readonly x: number
  readonly y: number
  readonly suit: Suit
  readonly size: number
  readonly reducedMotion: boolean
}

export function FoundationBurst({
  burstKey,
  x,
  y,
  suit,
  size,
  reducedMotion,
}: FoundationBurstProps) {
  const particles = useMemo(() => {
    const spread = size * 2.1
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2
      const reach = spread * (0.65 + ((i * 7) % 5) / 10)
      return {
        dx: Math.cos(angle) * reach,
        dy: Math.sin(angle) * reach,
        scale: 0.55 + ((i * 3) % 4) / 8,
      }
    })
  }, [size])

  if (reducedMotion) return null

  return (
    <div className="fx-burst" style={{ left: x, top: y }} aria-hidden>
      {[0, 0.12].map((delay, i) => (
        <motion.span
          key={`${burstKey}-ring-${i}`}
          className="fx-burst__ring"
          style={{ width: size, height: size }}
          initial={{ scale: 0.35, opacity: 0.85 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{ duration: 0.85, ease: 'easeOut', delay }}
        />
      ))}
      {particles.map((p, i) => (
        <motion.span
          key={`${burstKey}-p-${i}`}
          className="fx-burst__particle"
          style={{ width: size * 0.3, height: size * 0.3 }}
          initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
          animate={{
            x: p.dx,
            y: p.dy,
            scale: p.scale,
            opacity: [0, 1, 1, 0],
            rotate: p.dx > 0 ? 160 : -160,
          }}
          transition={{ duration: 0.95, ease: 'easeOut', delay: 0.05 }}
        >
          <SuitGlyph suit={suit} />
        </motion.span>
      ))}
      <motion.span
        className="fx-burst__label"
        initial={{ scale: 0.6, opacity: 0, y: 0 }}
        animate={{ scale: [0.6, 1.15, 1], opacity: [0, 1, 1, 0], y: -size * 0.9 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        Set!
      </motion.span>
    </div>
  )
}
