import { formatTimestamp } from './format'

export function mapWatchLaterEntry(entry) {
  const v = entry?.video
  if (!v) return null
  return {
    ...v,
    duration:
      v.duration ?? (v.durationSec != null ? formatTimestamp(v.durationSec) : undefined),
    inWatchLater: true,
  }
}

export function mapWatchLaterQueue(queue) {
  return (queue || []).map(mapWatchLaterEntry).filter(Boolean)
}
