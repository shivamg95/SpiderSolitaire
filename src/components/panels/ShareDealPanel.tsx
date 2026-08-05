import { useMemo, useState } from 'react'
import { renderSVG } from 'uqr'
import { Panel } from '@/components/panels/Panel'
import { buildDealShareCode, buildDealShareUrl } from '@/features/share/dealUrl'
import { useGameStore } from '@/state/gameStore'
import { useUiStore } from '@/state/uiStore'

export function ShareDealPanel() {
  const open = useUiStore((s) => s.openPanel === 'share')
  const closePanel = useUiStore((s) => s.closePanel)
  const seed = useGameStore((s) => s.handle.seed)
  const difficulty = useGameStore((s) => s.handle.difficulty)
  const [copied, setCopied] = useState<'url' | 'code' | null>(null)

  const shareUrl = useMemo(() => buildDealShareUrl(seed, difficulty), [seed, difficulty])
  const shareCode = useMemo(
    () => buildDealShareCode(seed, difficulty),
    [seed, difficulty],
  )
  const qrSvg = useMemo(
    () =>
      renderSVG(shareUrl, {
        ecc: 'M',
        border: 2,
        pixelSize: 8,
        whiteColor: '#0b1220',
        blackColor: '#7ee7ff',
      }),
    [shareUrl],
  )

  async function copyText(text: string, kind: 'url' | 'code') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => {
        setCopied(null)
      }, 1600)
    } catch {
      // Clipboard may be unavailable; leave feedback unset.
    }
  }

  async function nativeShare() {
    if (typeof navigator.share !== 'function') return
    try {
      await navigator.share({
        title: 'Spider Solitaire deal',
        text: `Play this Spider deal (${difficulty}-suit)`,
        url: shareUrl,
      })
    } catch {
      // User cancelled or share failed — ignore.
    }
  }

  return (
    <Panel title="Share deal" open={open} onClose={closePanel} className="panel--share">
      <p className="share-lead">
        Anyone opening this link gets the same {difficulty}-suit deal.
      </p>

      <div
        className="share-qr"
        aria-label="QR code for shareable deal link"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />

      <label className="share-field">
        <span>Link</span>
        <div className="share-row">
          <input
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={() => {
              void copyText(shareUrl, 'url')
            }}
          >
            {copied === 'url' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </label>

      <label className="share-field">
        <span>Code</span>
        <div className="share-row">
          <input
            type="text"
            readOnly
            value={shareCode}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={() => {
              void copyText(shareCode, 'code')
            }}
          >
            {copied === 'code' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </label>

      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
        <div className="settings-actions">
          <button type="button" onClick={() => void nativeShare()}>
            Share…
          </button>
        </div>
      ) : null}
    </Panel>
  )
}
