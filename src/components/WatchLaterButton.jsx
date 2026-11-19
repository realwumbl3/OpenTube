import { useEffect, useState } from 'react'
import { addToWatchLater, removeFromWatchLater } from '../api'
import { IconWatchLater } from './Icons'

export default function WatchLaterButton({
  videoId,
  saved: savedProp = false,
  variant = 'thumb',
  compact = false,
}) {
  const [saved, setSaved] = useState(savedProp)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSaved(savedProp)
  }, [savedProp, videoId])

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    const next = !saved
    setSaved(next)
    try {
      if (next) await addToWatchLater(videoId)
      else await removeFromWatchLater(videoId)
    } catch {
      setSaved(!next)
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'bar') {
    return (
      <button
        type="button"
        className={`engage-btn${saved ? ' engage-btn--active' : ''}`}
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
      >
        <IconWatchLater filled={saved} />
        <span>{saved ? 'Saved' : 'Watch later'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`watch-later-btn${saved ? ' watch-later-btn--saved' : ''}${
        compact ? ' watch-later-btn--compact' : ''
      }`}
      onClick={toggle}
      disabled={busy}
      aria-label={saved ? 'Remove from Watch later' : 'Save to Watch later'}
      title={saved ? 'Remove from Watch later' : 'Watch later'}
    >
      <IconWatchLater filled={saved} />
    </button>
  )
}
