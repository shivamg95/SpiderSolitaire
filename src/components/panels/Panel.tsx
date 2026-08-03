import { type ReactNode } from 'react'
import clsx from 'clsx'
import { motion } from 'motion/react'
import { useMotionPreset } from '@/animation/useMotionPreset'
import { useSettingsStore } from '@/state/settingsStore'

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

  if (!open) return null

  return (
    <div className="panel-backdrop" role="presentation" onClick={onClose}>
      <motion.div
        className={clsx('panel', className)}
        role="dialog"
        aria-modal
        aria-label={title}
        initial={preset.reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        animate={preset.reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={preset.panel as import('motion/react').Transition}
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
    </div>
  )
}
