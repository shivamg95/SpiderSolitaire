import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { motion } from 'motion/react'
import { useMotionPreset } from '@/animation/useMotionPreset'
import { useSettingsStore } from '@/state/settingsStore'
import './Panel.css'

export interface PanelProps {
  readonly title: string
  readonly open: boolean
  readonly onClose: () => void
  readonly children: ReactNode
  readonly className?: string
}

export function Panel({ title, open, onClose, children, className }: PanelProps) {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const preset = useMotionPreset(reducedMotion)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="panel-backdrop"
      role="presentation"
      onPointerDown={(e) => {
        // Capture phase on backdrop: swallow board-bound pointers.
        e.stopPropagation()
        if (e.target === e.currentTarget) onClose()
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        className={clsx('panel', className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={preset.reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        animate={preset.reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={preset.panel as import('motion/react').Transition}
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <header className="panel-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="panel-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="panel-body">{children}</div>
      </motion.div>
    </div>,
    document.body,
  )
}
