export function formatViews(n) {
  if (n == null || Number.isNaN(Number(n))) return '0 views'
  const v = Number(n)
  if (v < 1000) return `${v} view${v === 1 ? '' : 's'}`
  if (v < 1_000_000) return `${(v / 1000).toFixed(v < 10_000 ? 1 : 0).replace(/\.0$/, '')}K views`
  return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`
}

export function formatRelativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`
  const week = Math.floor(day / 7)
  if (week < 5) return `${week} week${week === 1 ? '' : 's'} ago`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month} month${month === 1 ? '' : 's'} ago`
  const year = Math.floor(day / 365)
  return `${year} year${year === 1 ? '' : 's'} ago`
}

export function formatTimestamp(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function parseTimestampInput(raw) {
  const s = String(raw || '').trim()
  if (!s) return NaN
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s)
  const parts = s.split(':').map((p) => Number(p))
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return NaN
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return NaN
}

export function formatStatLine(video) {
  const parts = [formatViews(video.views)]
  const rel = formatRelativeTime(video.createdAt)
  if (rel) parts.push(rel)
  return parts.join(' · ')
}
