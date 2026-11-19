import { randomBytes } from 'crypto'
import { clearLiveSignalingRoom } from './liveSignaling.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const root = path.join(__dirname, '..')
export const dataDir = path.join(root, 'data')
export const storageDir = path.join(root, 'storage', 'videos')
const dbFile = path.join(dataDir, 'db.json')

fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(storageDir, { recursive: true })

const empty = () => ({
    users: [],
    videos: [],
    video_variants: [],
    comments: [],
    comment_votes: [],
    subscriptions: [],
    watch_history: [],
    watch_later: [],
    live_streams: [],
    notifications: [],
    video_poll_votes: [],
    meta: { demo_seeded: false },
  })

const DEFAULT_CHANNEL_THEME = {
  bgColor: '#0f0f0f',
  fontFamily: 'system-ui, sans-serif',
  layout: 'grid',
}

export const BADGE_DEFS = [
  { id: 'videos_100', label: '100 Videos', minVideos: 100 },
  { id: 'views_10k', label: '10K Views', minTotalViews: 10000 },
]

let state = fs.existsSync(dbFile)
  ? { ...empty(), ...JSON.parse(fs.readFileSync(dbFile, 'utf8')) }
  : empty()
if (!state.meta) state.meta = { demo_seeded: false }
if (!state.comment_votes) state.comment_votes = []
if (!state.watch_later) state.watch_later = []
if (!state.live_streams) state.live_streams = []
if (!state.video_poll_votes) state.video_poll_votes = []

const SUBTITLE_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'hi']

function inferSubtitleLanguage(videoId) {
  let h = 0
  for (let i = 0; i < videoId.length; i++) h = (h * 31 + videoId.charCodeAt(i)) | 0
  return SUBTITLE_LANGUAGES[Math.abs(h) % SUBTITLE_LANGUAGES.length]
}

export function ensureVideoSubtitleLanguages() {
  let changed = false
  for (const v of state.videos) {
    if (!v.subtitle_language) {
      v.subtitle_language = inferSubtitleLanguage(v.id)
      changed = true
    }
  }
  if (changed) persist()
}

ensureVideoSubtitleLanguages()

function persist() {
  fs.writeFileSync(dbFile, JSON.stringify(state, null, 2), 'utf8')
}

export const DEFAULT_USER_ID = 'user-default'

export function getUserById(id) {
  return state.users.find((u) => u.id === id)
}

export function getUserBySession(token) {
  const u = state.users.find((x) => x.session_token === token)
  if (!u) return null
  return {
    id: u.id,
    username: u.username,
    display_name: u.display_name,
    quick_switch: Boolean(u.quick_switch),
  }
}

export function getUserByMagicToken(token) {
  return state.users.find((u) => u.magic_login_token === token)
}

function videoPrivacy(v) {
  return v.privacy || 'public'
}

export function canViewVideo(video, viewerUserId = null) {
  const p = videoPrivacy(video)
  if (p === 'public') return true
  if (p === 'unlisted') return true
  if (p === 'private') return viewerUserId && viewerUserId === video.user_id
  return false
}

export function listReadyVideos({ viewerUserId = null, includeNonPublic = false } = {}) {
    return state.videos
      .filter((v) => {
        if (v.status !== 'ready' && v.status !== 'live') return false
      const p = videoPrivacy(v)
      if (p === 'public') return true
      if (includeNonPublic && viewerUserId === v.user_id) return true
      return false
    })
    .map((v) => {
      const u = state.users.find((x) => x.id === v.user_id)
      return { ...v, channel_name: u?.display_name || 'Unknown' }
    })
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export function getVideoById(id) {
  const v = state.videos.find((x) => x.id === id)
  if (!v) return null
  const u = state.users.find((x) => x.id === v.user_id)
  return { ...v, channel_name: u?.display_name || 'Unknown' }
}

export function videoExists(id) {
  return state.videos.some((x) => x.id === id)
}

export function incrementViews(id) {
  const v = state.videos.find((x) => x.id === id)
  if (v) v.views += 1
  persist()
}

export function getVariants(videoId) {
  return state.video_variants
    .filter((vr) => vr.video_id === videoId)
    .sort((a, b) => (b.height || 0) - (a.height || 0))
}

export function upsertVariant(videoId, label, filePath, width, height) {
  const i = state.video_variants.findIndex((vr) => vr.video_id === videoId && vr.label === label)
  const row = { video_id: videoId, label, file_path: filePath, width, height }
  if (i >= 0) state.video_variants[i] = row
  else state.video_variants.push(row)
  persist()
}

export function setVideoFailed(id) {
  const v = state.videos.find((x) => x.id === id)
  if (v) v.status = 'failed'
  persist()
}

export function setVideoReady(id, thumbPath, durationSec) {
  const v = state.videos.find((x) => x.id === id)
  if (v) {
    v.status = 'ready'
    v.thumb_path = thumbPath
    v.duration_sec = durationSec
  }
  persist()
}

export function createVideo({ id, userId, title, description, privacy = 'public' }) {
  const allowed = ['public', 'unlisted', 'private']
  const p = allowed.includes(privacy) ? privacy : 'public'
  state.videos.push({
    id,
    user_id: userId,
    title,
    description,
    privacy: p,
    status: 'processing',
    views: 0,
    thumb_path: null,
    duration_sec: null,
    created_at: new Date().toISOString(),
  })
  persist()
}

export function setVideoPrivacy(videoId, userId, privacy) {
  const v = state.videos.find((x) => x.id === videoId && x.user_id === userId)
  if (!v) return null
  const allowed = ['public', 'unlisted', 'private']
  if (!allowed.includes(privacy)) return null
  v.privacy = privacy
  persist()
  return v
}

function normalizeChapters(chapters, durationSec = null) {
  if (!Array.isArray(chapters)) return []
  const out = []
  for (const raw of chapters.slice(0, 50)) {
    const startSec = Math.floor(Number(raw?.startSec))
    const title = String(raw?.title || '').trim().slice(0, 100)
    if (!Number.isFinite(startSec) || startSec < 0 || !title) continue
    if (durationSec != null && Number.isFinite(durationSec) && startSec > durationSec) continue
    out.push({ startSec, title })
  }
  out.sort((a, b) => a.startSec - b.startSec)
  const seen = new Set()
  return out.filter((c) => {
    if (seen.has(c.startSec)) return false
    seen.add(c.startSec)
    return true
  })
  }

  export function getVideoChapters(videoId) {
  const v = getVideoById(videoId)
  if (!v?.chapters?.length) return []
  return normalizeChapters(v.chapters, v.duration_sec)
  }

  export function setVideoChapters(videoId, userId, chapters) {
  const v = state.videos.find((x) => x.id === videoId && x.user_id === userId)
  if (!v) return null
  const normalized = normalizeChapters(chapters, v.duration_sec)
  if (normalized.length) v.chapters = normalized
  else delete v.chapters
  persist()
  return normalized
  }

  export function getVideoPollPublic(videoId, viewerUserId = null) {
  const v = getVideoById(videoId)
  const poll = v?.poll
  if (!poll?.question || !Array.isArray(poll.options) || poll.options.length < 2) return null
  const options = poll.options.map((text, i) => ({
    id: String(i),
    text: String(text).slice(0, 80),
  }))
  const votes = state.video_poll_votes.filter((row) => row.video_id === videoId)
  let myVote = null
  if (viewerUserId) {
    const mine = votes.find((row) => row.user_id === viewerUserId)
    if (mine != null) myVote = String(mine.option_index)
  }
  return {
    question: String(poll.question).slice(0, 200),
    options: options.map((o, i) => ({
      ...o,
      votes: votes.filter((row) => row.option_index === i).length,
    })),
    myVote,
    totalVotes: votes.length,
  }
  }

  export function setVideoPoll(videoId, userId, { question, options }) {
  const v = state.videos.find((x) => x.id === videoId && x.user_id === userId)
  if (!v) return null
  const q = String(question || '').trim().slice(0, 200)
  const opts = (Array.isArray(options) ? options : [])
    .map((t) => String(t || '').trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 6)
  if (!q || opts.length < 2) {
    delete v.poll
    state.video_poll_votes = state.video_poll_votes.filter((row) => row.video_id !== videoId)
    persist()
    return null
  }
  const changed =
    v.poll?.question !== q || JSON.stringify(v.poll?.options) !== JSON.stringify(opts)
  v.poll = { question: q, options: opts, updatedAt: new Date().toISOString() }
  if (changed) {
    state.video_poll_votes = state.video_poll_votes.filter((row) => row.video_id !== videoId)
  }
  persist()
  return getVideoPollPublic(videoId, userId)
  }

  export function voteVideoPoll(videoId, userId, optionId) {
  const v = getVideoById(videoId)
  if (!v?.poll?.options?.length) return { error: 'no_poll' }
  const idx = Number(optionId)
  if (!Number.isInteger(idx) || idx < 0 || idx >= v.poll.options.length) return { error: 'invalid_option' }
  const existing = state.video_poll_votes.findIndex(
    (row) => row.video_id === videoId && row.user_id === userId,
  )
  const row = { video_id: videoId, user_id: userId, option_index: idx, voted_at: new Date().toISOString() }
  if (existing >= 0) state.video_poll_votes[existing] = row
  else state.video_poll_votes.push(row)
  persist()
  return { poll: getVideoPollPublic(videoId, userId) }
  }

  function commentVoteStats(commentId, viewerUserId = null) {
  let score = 0
  let viewerVote = 0
  for (const v of state.comment_votes) {
    if (v.comment_id !== commentId) continue
    score += v.vote
    if (viewerUserId && v.user_id === viewerUserId) viewerVote = v.vote
  }
  return { score, viewerVote }
}

function commentToPublic(c, viewerUserId = null) {
  const u = state.users.find((x) => x.id === c.user_id)
  const { score, viewerVote } = commentVoteStats(c.id, viewerUserId)
  return {
    id: c.id,
    parent_id: c.parent_id || null,
    body: c.body,
    created_at: c.created_at,
    author: u?.display_name || 'User',
    score,
    viewerVote,
  }
}

export function getCommentById(id) {
  return state.comments.find((c) => c.id === id) || null
}

export function setCommentVote(commentId, userId, direction) {
  const comment = getCommentById(commentId)
  if (!comment) return null
  const want = direction === 'down' ? -1 : 1
  const idx = state.comment_votes.findIndex(
    (v) => v.comment_id === commentId && v.user_id === userId
  )
  if (idx >= 0) {
    if (state.comment_votes[idx].vote === want) {
      state.comment_votes.splice(idx, 1)
    } else {
      state.comment_votes[idx].vote = want
    }
  } else {
    state.comment_votes.push({ comment_id: commentId, user_id: userId, vote: want })
  }
  persist()
  return commentToPublic(comment, userId)
}

export function listComments(videoId, viewerUserId = null) {
  const flat = state.comments
    .filter((c) => c.video_id === videoId)
    .map((c) => commentToPublic(c, viewerUserId))
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))

  const byId = new Map(flat.map((c) => [c.id, { ...c, replies: [] }]))
  const roots = []
  for (const c of flat) {
    const node = byId.get(c.id)
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id).replies.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function listChannelCommentFeed(channelUserId, viewerUserId = null) {
  const videos = listChannelVideos(channelUserId, viewerUserId)
  const videoIds = new Set(videos.map((v) => v.id))
  const titleById = new Map(videos.map((v) => [v.id, v.title]))

  return state.comments
    .filter((c) => videoIds.has(c.video_id))
    .map((c) => {
      const base = commentToPublic(c, viewerUserId)
      let replyToAuthor = null
      if (c.parent_id) {
        const parent = state.comments.find((x) => x.id === c.parent_id)
        if (parent) {
          const pu = state.users.find((x) => x.id === parent.user_id)
          replyToAuthor = pu?.display_name || 'User'
        }
      }
      return {
        ...base,
        videoId: c.video_id,
        videoTitle: titleById.get(c.video_id) || 'Video',
        replyToAuthor,
      }
    })
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export function addComment({ id, videoId, userId, body, parentId = null }) {
  if (parentId) {
    const parent = state.comments.find((c) => c.id === parentId && c.video_id === videoId)
    if (!parent) return null
  }
  const row = {
    id,
    video_id: videoId,
    user_id: userId,
    body,
    parent_id: parentId || null,
    created_at: new Date().toISOString(),
  }
  state.comments.push(row)
  if (parentId) {
    const parent = state.comments.find((c) => c.id === parentId)
    if (parent && parent.user_id !== userId) {
      addReplyNotification({
        recipientId: parent.user_id,
        fromUserId: userId,
        videoId,
        commentId: id,
        parentCommentId: parentId,
      })
    }
  }
  persist()
  return commentToPublic(row, userId)
  }

  function addReplyNotification({
  recipientId,
  fromUserId,
  videoId,
  commentId,
  parentCommentId,
}) {
  if (!state.notifications) state.notifications = []
  state.notifications.push({
    id: randomBytes(16).toString('hex'),
    type: 'comment_reply',
    recipient_id: recipientId,
    from_user_id: fromUserId,
    video_id: videoId,
    comment_id: commentId,
    parent_comment_id: parentCommentId,
    read: false,
    created_at: new Date().toISOString(),
  })
}

function addSubscriptionNotification({ recipientId, fromUserId }) {
  if (!state.notifications) state.notifications = []
  if (recipientId === fromUserId) return
  state.notifications.push({
    id: randomBytes(16).toString('hex'),
    type: 'subscription',
    recipient_id: recipientId,
    from_user_id: fromUserId,
    read: false,
    created_at: new Date().toISOString(),
  })
}

export function listNotifications(userId) {
  if (!state.notifications) state.notifications = []
  return state.notifications
    .filter((n) => n.recipient_id === userId)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map((n) => {
      const from = state.users.find((u) => u.id === n.from_user_id)
      const video = n.video_id ? getVideoById(n.video_id) : null
      let videoThumb = null
      if (video?.thumb_path) {
        const p = video.thumb_path
        videoThumb =
          p.startsWith('http://') || p.startsWith('https://')
            ? p
            : `/media/${p.replace(/\\/g, '/').replace(/^storage\//, '')}`
      }
      return {
        id: n.id,
        type: n.type,
        read: Boolean(n.read),
        createdAt: n.created_at,
        fromUserId: n.from_user_id,
        fromName: from?.display_name || 'Someone',
        videoId: n.video_id,
        videoTitle: video?.title || 'Video',
        videoThumb,
        commentId: n.comment_id,
      }
    })
}

export function markNotificationRead(userId, notificationId) {
  if (!state.notifications) return false
  const n = state.notifications.find(
    (x) => x.id === notificationId && x.recipient_id === userId
  )
  if (!n) return false
  n.read = true
  persist()
  return true
}

export function markAllNotificationsRead(userId) {
  if (!state.notifications) return
  let changed = false
  for (const n of state.notifications) {
    if (n.recipient_id === userId && !n.read) {
      n.read = true
      changed = true
    }
  }
  if (changed) persist()
}

export function unreadNotificationCount(userId) {
  if (!state.notifications) return 0
  return state.notifications.filter((n) => n.recipient_id === userId && !n.read).length
}

export function isSubscribed(subscriberId, channelUserId) {
  if (subscriberId === channelUserId) return false
  return state.subscriptions.some(
    (s) => s.subscriber_id === subscriberId && s.channel_id === channelUserId
  )
}

export function setSubscription(subscriberId, channelUserId, subscribe) {
  if (subscriberId === channelUserId) return false
  const i = state.subscriptions.findIndex(
    (s) => s.subscriber_id === subscriberId && s.channel_id === channelUserId
  )
  if (subscribe) {
    if (i < 0) {
      state.subscriptions.push({
        subscriber_id: subscriberId,
        channel_id: channelUserId,
        created_at: new Date().toISOString(),
      })
      addSubscriptionNotification({
        recipientId: channelUserId,
        fromUserId: subscriberId,
      })
      persist()
    }
    return true
  }
  if (i >= 0) {
    state.subscriptions.splice(i, 1)
    persist()
  }
  return true
}

function getChannelTheme(user) {
  const t = user?.channel_theme
  return {
    bgColor: t?.bgColor || DEFAULT_CHANNEL_THEME.bgColor,
    fontFamily: t?.fontFamily || DEFAULT_CHANNEL_THEME.fontFamily,
    layout: t?.layout === 'list' ? 'list' : 'grid',
  }
}

export function getChannelStats(userId) {
  const ready = state.videos.filter((v) => v.user_id === userId && v.status === 'ready')
  const videoCount = ready.length
  const totalViews = ready.reduce((sum, v) => sum + (v.views || 0), 0)
  return { videoCount, totalViews }
}

export function getChannelBadges(userId) {
  const { videoCount, totalViews } = getChannelStats(userId)
  return BADGE_DEFS.filter((b) => {
    if (b.minVideos != null && videoCount >= b.minVideos) return true
    if (b.minTotalViews != null && totalViews >= b.minTotalViews) return true
    return false
  }).map((b) => ({ id: b.id, label: b.label }))
}

export function getActiveChannelAnnouncement(userId) {
    const u = getUserById(userId)
    const a = u?.channel_announcement
    if (!a?.text) return null
    if (a.expiresAt && new Date(a.expiresAt) < new Date()) return null
    return { text: String(a.text).slice(0, 500), expiresAt: a.expiresAt || null }
  }

  export function setChannelAnnouncement(userId, { text, durationHours = 24 }) {
    const u = getUserById(userId)
    if (!u) return null
    const trimmed = (text || '').trim()
    if (!trimmed) {
      delete u.channel_announcement
      persist()
      return null
    }
    const hours = Math.min(168, Math.max(1, Number(durationHours) || 24))
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    u.channel_announcement = { text: trimmed.slice(0, 500), expiresAt }
    persist()
    return getActiveChannelAnnouncement(userId)
  }

  export function getPublicChannel(userId, viewerUserId = null) {
    const u = getUserById(userId)
    if (!u) return null
    const isOwner = viewerUserId === userId
    return {
      id: u.id,
      displayName: u.display_name,
      username: u.username,
      theme: getChannelTheme(u),
      badges: getChannelBadges(userId),
      stats: getChannelStats(userId),
      isOwner,
      announcement: isOwner ? getActiveChannelAnnouncement(userId) : null,
      liveStream: getActiveLiveStreamForUser(userId),
    }
  }

  export function getActiveLiveStreamForUser(userId) {
    return state.live_streams.find((s) => s.user_id === userId && s.status === 'live') || null
  }

  export function listActiveLiveStreams() {
    return state.live_streams.filter((s) => s.status === 'live')
  }

  export function startLiveStream(userId, { title, description }) {
    if (getActiveLiveStreamForUser(userId)) {
      return { error: 'already_live', stream: getActiveLiveStreamForUser(userId) }
    }
    const streamId = randomBytes(16).toString('hex')
    const videoId = randomBytes(16).toString('hex')
    const now = new Date().toISOString()
    const streamTitle = (title || 'Live Stream').trim().slice(0, 200) || 'Live Stream'

    state.live_streams.push({
      id: streamId,
      user_id: userId,
      video_id: videoId,
      title: streamTitle,
      description: (description || '').trim().slice(0, 2000),
      status: 'live',
      started_at: now,
    })

    state.videos.push({
      id: videoId,
      user_id: userId,
      title: streamTitle,
      description: (description || '').trim().slice(0, 2000),
      privacy: 'public',
      status: 'live',
      live_stream_id: streamId,
      views: 0,
      thumb_path: null,
      duration_sec: null,
      subtitle_language: 'en',
      created_at: now,
    })

    state.video_variants.push({
      video_id: videoId,
      label: 'live',
      file_path: 'webrtc:',
      width: 1280,
      height: 720,
    })
    persist()
    return { streamId, videoId, title: streamTitle }
  }

  export function stopLiveStream(userId) {
    const stream = getActiveLiveStreamForUser(userId)
    if (!stream) return null
    stream.status = 'ended'
    stream.ended_at = new Date().toISOString()
    const v = state.videos.find((x) => x.id === stream.video_id)
    if (v) v.status = 'ended'
    clearLiveSignalingRoom(stream.video_id)
    persist()
    return stream
}

  export function listWatchLater(userId) {
    const rows = state.watch_later
      .filter((w) => w.user_id === userId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    return rows
      .map((w, i) => {
        const v = state.videos.find((x) => x.id === w.video_id)
        if (!v || (v.status !== 'ready' && v.status !== 'live') || !canViewVideo(v, userId)) return null
        const u = state.users.find((x) => x.id === v.user_id)
        return {
          sortOrder: w.sort_order ?? i,
          video: {
            id: v.id,
            title: v.title,
            description: v.description,
            channel: u?.display_name || 'Unknown',
            userId: v.user_id,
            views: v.views,
            durationSec: v.duration_sec,
            thumb: v.thumb_path
              ? v.thumb_path.startsWith('http')
                ? v.thumb_path
                : `/media/${v.thumb_path.replace(/\\/g, '/').replace(/^storage\//, '')}`
              : null,
            createdAt: v.created_at,
            isLive: v.status === 'live',
          },
        }
      })
      .filter(Boolean)
  }

  export function addWatchLater(userId, videoId) {
    if (!videoExists(videoId)) return { error: 'not_found' }
    const v = getVideoById(videoId)
    if (!canViewVideo(v, userId)) return { error: 'not_found' }
    if (state.watch_later.some((w) => w.user_id === userId && w.video_id === videoId)) {
      return { ok: true }
    }
    const maxOrder = state.watch_later
      .filter((w) => w.user_id === userId)
      .reduce((m, w) => Math.max(m, w.sort_order ?? 0), -1)
    state.watch_later.push({ user_id: userId, video_id: videoId, sort_order: maxOrder + 1 })
    persist()
    return { ok: true }
  }

  export function removeWatchLater(userId, videoId) {
    const i = state.watch_later.findIndex((w) => w.user_id === userId && w.video_id === videoId)
    if (i < 0) return false
    state.watch_later.splice(i, 1)
    persist()
    return true
  }

  export function reorderWatchLater(userId, videoIds) {
    if (!Array.isArray(videoIds)) return false
    const owned = state.watch_later.filter((w) => w.user_id === userId)
    const idSet = new Set(videoIds)
    if (videoIds.length !== owned.filter((w) => idSet.has(w.video_id)).length) return false
    for (const w of owned) {
      const idx = videoIds.indexOf(w.video_id)
      if (idx >= 0) w.sort_order = idx
    }
    persist()
    return true
  }

  export function isInWatchLater(userId, videoId) {
    return state.watch_later.some((w) => w.user_id === userId && w.video_id === videoId)
  }

  export function setChannelTheme(userId, theme) {
    const u = getUserById(userId)
    if (!u) return null
    const next = getChannelTheme(u)
    if (theme?.bgColor && /^#[0-9A-Fa-f]{3,8}$/.test(theme.bgColor)) next.bgColor = theme.bgColor
    if (theme?.fontFamily && typeof theme.fontFamily === 'string') {
      next.fontFamily = theme.fontFamily.slice(0, 120)
    }
    if (theme?.layout === 'list' || theme?.layout === 'grid') next.layout = theme.layout
    u.channel_theme = next
    persist()
  return next
}

export function listChannelVideos(channelUserId, viewerUserId = null) {
    const isOwner = viewerUserId === channelUserId
    return state.videos
      .filter((v) => {
        if (v.user_id !== channelUserId || (v.status !== 'ready' && v.status !== 'live')) return false
      const p = videoPrivacy(v)
      if (p === 'public') return true
      if (p === 'unlisted' && isOwner) return true
      if (p === 'private' && isOwner) return true
      return false
    })
    .map((v) => {
      const u = state.users.find((x) => x.id === v.user_id)
      return { ...v, channel_name: u?.display_name || 'Unknown' }
    })
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export function listSubscribedFeedVideos(subscriberId) {
  const subs = state.subscriptions.filter((s) => s.subscriber_id === subscriberId)
  if (!subs.length) return []
  const subscribedAt = new Map(subs.map((s) => [s.channel_id, s.created_at || '']))
  return state.videos
    .filter((v) => {
      if (v.status !== 'ready' || !subscribedAt.has(v.user_id)) return false
      const p = videoPrivacy(v)
      if (p === 'private') return false
      const subAt = subscribedAt.get(v.user_id)
      return (v.created_at || '') >= subAt
    })
    .map((v) => {
      const u = state.users.find((x) => x.id === v.user_id)
      return { ...v, channel_name: u?.display_name || 'Unknown' }
    })
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export function listSubscribedChannels(subscriberId) {
  return state.subscriptions
    .filter((s) => s.subscriber_id === subscriberId)
    .map((s) => {
    const u = getUserById(s.channel_id)
    if (!u) return null
    return {
      id: u.id,
      displayName: u.display_name,
      username: u.username,
      subscribedAt: s.created_at || '',
      stats: getChannelStats(u.id),
    }
    })
    .filter(Boolean)
    .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', undefined, { sensitivity: 'base' }))
}

export function recordWatchHistory(userId, videoId, positionSec = 0) {
  if (!videoExists(videoId)) return
  const now = new Date().toISOString()
  const i = state.watch_history.findIndex((h) => h.user_id === userId && h.video_id === videoId)
  const row = {
    user_id: userId,
    video_id: videoId,
    watched_at: now,
    position_sec: Math.max(0, Number(positionSec) || 0),
  }
  if (i >= 0) state.watch_history[i] = { ...state.watch_history[i], ...row }
  else state.watch_history.push(row)
  persist()
}

export function listWatchHistory(userId) {
  return state.watch_history
    .filter((h) => h.user_id === userId)
    .sort((a, b) => (b.watched_at || '').localeCompare(a.watched_at || ''))
    .map((h) => {
      const v = state.videos.find((x) => x.id === h.video_id)
      if (!v || v.status !== 'ready' || !canViewVideo(v, userId)) return null
      const ch = state.users.find((x) => x.id === v.user_id)
      return {
        watchedAt: h.watched_at,
        positionSec: h.position_sec,
        video: {
          id: v.id,
          title: v.title,
          description: v.description,
          channel: ch?.display_name || 'Unknown',
          userId: v.user_id,
          views: v.views,
          durationSec: v.duration_sec,
          thumb: v.thumb_path
            ? v.thumb_path.startsWith('http://') || v.thumb_path.startsWith('https://')
              ? v.thumb_path
              : `/media/${v.thumb_path.replace(/\\/g, '/').replace(/^storage\//, '')}`
            : null,
          createdAt: v.created_at,
        },
      }
    })
    .filter(Boolean)
}

export function getDemoSeeded() {
  return Boolean(state.meta?.demo_seeded)
}

export function setDemoSeeded(value) {
  state.meta = { ...state.meta, demo_seeded: value }
  persist()
}

const isDemoUserId = (id) =>
  id === DEFAULT_USER_ID || id.startsWith('user-persona-') || id.startsWith('user-fake-')

const isAutoVideo = (v) =>
  (v.description || '').startsWith('Auto-generated demo')

export function clearDemoSeedData() {
  const keepVideoIds = new Set(
    state.videos.filter((v) => !isAutoVideo(v)).map((v) => v.id)
  )
  state.users = state.users.filter((u) => !u.id.startsWith('user-fake-') && !u.id.startsWith('user-persona-'))
  state.videos = state.videos.filter((v) => !isAutoVideo(v))
  state.video_variants = state.video_variants.filter((vr) => keepVideoIds.has(vr.video_id))
  state.subscriptions = state.subscriptions.filter(
    (s) => !isDemoUserId(s.subscriber_id) && !isDemoUserId(s.channel_id)
  )
  state.meta = { ...state.meta, demo_seeded: false }
  persist()
}

export function createUserRecord({ id, username, display_name, quick_switch = false }) {
  let row = getUserById(id)
  if (row) return row
  row = {
    id,
    username,
    display_name,
    quick_switch: Boolean(quick_switch),
    session_token: randomBytes(32).toString('hex'),
    magic_login_token: randomBytes(24).toString('hex'),
    created_at: new Date().toISOString(),
  }
  state.users.push(row)
  persist()
  return row
}

export function createSeededVideoRecord({
  id,
  userId,
  title,
  description,
  created_at,
  views,
  duration_sec,
  thumb_path,
  variant_url,
}) {
  if (videoExists(id)) return
  state.videos.push({
    id,
    user_id: userId,
    title,
    description,
    status: 'ready',
    views: views ?? 0,
    thumb_path,
    duration_sec,
    created_at,
  })
  state.video_variants.push({
    video_id: id,
    label: '720',
    file_path: variant_url,
    width: 1280,
    height: 720,
  })
  persist()
}

export function addSubscriptionRecord(subscriberId, channelId, created_at) {
  if (subscriberId === channelId) return
  const exists = state.subscriptions.some(
    (s) => s.subscriber_id === subscriberId && s.channel_id === channelId
  )
  if (exists) return
  state.subscriptions.push({ subscriber_id: subscriberId, channel_id: channelId, created_at })
  persist()
}

export function listQuickSwitchUsers() {
  return state.users
    .filter((u) => u.quick_switch)
    .map((u) => ({ id: u.id, username: u.username, display_name: u.display_name }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name))
}

export function canImpersonateUser(actorId, targetId) {
  const actor = getUserById(actorId)
  const target = getUserById(targetId)
  if (!actor?.quick_switch || !target?.quick_switch) return false
  return true
}

export function getSessionTokenForUser(userId) {
  const u = getUserById(userId)
  return u?.session_token ?? null
}

export function setUserQuickSwitch(userId, value) {
  const u = getUserById(userId)
  if (!u) return
  u.quick_switch = Boolean(value)
  persist()
}

export function ensureDefaultUser() {
  let row = getUserById(DEFAULT_USER_ID)
  if (row) return row

  const magic = randomBytes(24).toString('hex')
  const session = randomBytes(32).toString('hex')

  state.users.push({
    id: DEFAULT_USER_ID,
    username: 'default',
    display_name: 'Default Channel',
    session_token: session,
    magic_login_token: magic,
    created_at: new Date().toISOString(),
  })
  persist()

  const webOrigin = process.env.PUBLIC_WEB_ORIGIN || 'http://localhost:5173'
  const loginPath = path.join(root, 'DEFAULT_LOGIN_URL.txt')
  const url = `${webOrigin}/login/${magic}`
  const lines = [
    'Instant login for the default account (open in browser while the app is running):',
    '',
    url,
    '',
    'API via Vite proxy (sets session cookie on the app origin):',
    `${webOrigin}/api/auth/magic/${magic}`,
  ]
  fs.writeFileSync(loginPath, lines.join('\n'), 'utf8')
  console.log('\n=== DEFAULT LOGIN URL ===')
  console.log(url)
  console.log('(also saved to DEFAULT_LOGIN_URL.txt)\n')

  return getUserById(DEFAULT_USER_ID)
}

ensureDefaultUser()
