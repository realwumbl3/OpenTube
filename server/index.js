import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import {
  root,
  storageDir,
  DEFAULT_USER_ID,
  getUserBySession,
  getUserByMagicToken,
  listReadyVideos,
  getVideoById,
  incrementViews,
  getVariants,
  listComments,
  addComment,
  getCommentById,
  setCommentVote,
  videoExists,
  createVideo,
  setVideoFailed,
  getUserById,
  isSubscribed,
  setSubscription,
  listSubscribedFeedVideos,
  listSubscribedChannels,
  recordWatchHistory,
  listWatchHistory,
  listQuickSwitchUsers,
  canImpersonateUser,
  getSessionTokenForUser,
  canViewVideo,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  unreadNotificationCount,
  getPublicChannel,
  setChannelTheme,
  listChannelVideos,
  listChannelCommentFeed,
  setVideoPrivacy,
  getActiveChannelAnnouncement,
  setChannelAnnouncement,
  startLiveStream,
  stopLiveStream,
  listActiveLiveStreams,
  getActiveLiveStreamForUser,
  listWatchLater,
  addWatchLater,
  removeWatchLater,
  reorderWatchLater,
  isInWatchLater,
  getVideoChapters,
  setVideoChapters,
  getVideoPollPublic,
  setVideoPoll,
  voteVideoPoll,
  } from './store.js'
import { processVideo, formatDuration } from './videoProcessor.js'
import { ensureDemoSeed } from './seed.js'
import {
  touchBroadcaster,
  viewerJoinLive,
  drainJoinQueue,
  pushToViewer,
  pushToBroadcaster,
  drainViewerSignals,
  drainAllBroadcasterSignals,
} from './liveSignaling.js'

const app = express()
const PORT = 3001
/** Public dev URL for the SPA; API routes on this origin are proxied to PORT. */
const PUBLIC_WEB_ORIGIN = process.env.PUBLIC_WEB_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json())

app.use('/media', express.static(path.join(root, 'storage')))

function getUserFromSession(req) {
  const token = req.cookies?.session
  if (!token) return null
  return getUserBySession(token)
}

function requireAuth(req, res, next) {
  const user = getUserFromSession(req)
  if (!user) return res.status(401).json({ error: 'Not signed in' })
  req.user = user
  next()
}

function displayDuration(video) {
  if (video.status === 'live') return 'LIVE'
  return formatDuration(video.duration_sec)
}

function thumbUrl(video) {
      if (video.status === 'live') return '/favicon.svg'
    if (!video.thumb_path) return null
  if (video.thumb_path.startsWith('http://') || video.thumb_path.startsWith('https://')) {
    return video.thumb_path
  }
  return `/media/${video.thumb_path.replace(/\\/g, '/').replace(/^storage\//, '')}`
}

function variantUrl(filePath) {
  if (!filePath) return null
  if (filePath === 'webrtc:') return 'webrtc'
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath
  const rel = filePath.replace(/\\/g, '/').replace(/^storage\//, '')
  return `/media/${rel}`
}

function videoSourceVariants(v) {
  if (v.status === 'live') {
    return [{ label: 'live', file_path: 'webrtc:' }]
  }
  return getVariants(v.id)
}

app.get('/api/auth/me', (req, res) => {
  const user = getUserFromSession(req)
  if (!user) return res.json({ user: null })
  res.json({ user })
})

app.get('/api/auth/magic/:token', (req, res) => {
  const user = getUserByMagicToken(req.params.token)
  if (!user) return res.status(404).send('Invalid login link')
  res.cookie('session', user.session_token, { httpOnly: true, sameSite: 'lax', maxAge: 365 * 24 * 60 * 60 * 1000 })
  res.redirect('http://localhost:5173/')
})

app.post('/api/auth/magic/:token', (req, res) => {
  const user = getUserByMagicToken(req.params.token)
  if (!user) return res.status(404).json({ error: 'Invalid token' })
  res.cookie('session', user.session_token, { httpOnly: true, sameSite: 'lax', maxAge: 365 * 24 * 60 * 60 * 1000 })
  res.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      quick_switch: Boolean(user.quick_switch),
    },
  })
})

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session')
  res.json({ ok: true })
})

app.get('/api/auth/switchable', requireAuth, (req, res) => {
  if (!req.user.quick_switch && !getUserById(req.user.id)?.quick_switch) {
    return res.json({ users: [] })
  }
  res.json({ users: listQuickSwitchUsers() })
})

app.post('/api/auth/switch/:userId', requireAuth, (req, res) => {
  const targetId = req.params.userId
  if (!canImpersonateUser(req.user.id, targetId)) {
    return res.status(403).json({ error: 'Cannot switch to this account' })
  }
  const token = getSessionTokenForUser(targetId)
  if (!token) return res.status(404).json({ error: 'User not found' })
  const target = getUserById(targetId)
  res.cookie('session', token, { httpOnly: true, sameSite: 'lax', maxAge: 365 * 24 * 60 * 60 * 1000 })
  res.json({
    user: {
      id: target.id,
      username: target.username,
      display_name: target.display_name,
      quick_switch: Boolean(target.quick_switch),
    },
  })
})

app.get('/api/videos', (req, res) => {
  const sessionUser = getUserFromSession(req)
  const q = (req.query.q || '').trim().toLowerCase()
  let rows = listReadyVideos({ viewerUserId: sessionUser?.id })

  if (q) {
    rows = rows.filter(
      (v) => v.title.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q)
    )
  }

  res.json({
    videos: rows.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      channel: v.channel_name,
      userId: v.user_id,
      views: v.views,
      duration: displayDuration(v),
      durationSec: v.duration_sec,
      thumb: thumbUrl(v),
      createdAt: v.created_at,
      isLive: v.status === 'live',
      subtitleLanguage: v.subtitle_language || 'en',
      inWatchLater: sessionUser ? isInWatchLater(sessionUser.id, v.id) : false,
      })),
    })
  })

  app.get('/api/videos/:id', (req, res) => {
    const sessionUser = getUserFromSession(req)
    const v = getVideoById(req.params.id)
  if (!v || v.status === 'ended') return res.status(404).json({ error: 'Not found' })
  if (!canViewVideo(v, sessionUser?.id)) return res.status(404).json({ error: 'Not found' })

  incrementViews(v.id)
  const views = v.views + 1

  if (sessionUser) {
    const pos = Number(req.query.position)
    recordWatchHistory(sessionUser.id, v.id, Number.isFinite(pos) ? pos : 0)
  }

  const variants = videoSourceVariants(v)
  const subscribed = sessionUser ? isSubscribed(sessionUser.id, v.user_id) : false
  const isOwner = sessionUser?.id === v.user_id

  res.json({
    video: {
      id: v.id,
      title: v.title,
      description: v.description,
      channel: v.channel_name,
      userId: v.user_id,
      privacy: v.privacy || 'public',
      views,
      status: v.status,
      isLive: v.status === 'live',
      playback: v.status === 'live' ? 'webrtc' : 'file',
      isOwner,
      channelAnnouncement: getActiveChannelAnnouncement(v.user_id),
      inWatchLater: sessionUser ? isInWatchLater(sessionUser.id, v.id) : false,
      duration: displayDuration(v),
      durationSec: v.duration_sec,
      thumb: thumbUrl(v),
      sources: variants.map((vr) => ({
        label: vr.label,
        src: variantUrl(vr.file_path),
      })),
      createdAt: v.created_at,
      subscribed,
      chapters: getVideoChapters(v.id),
      poll: getVideoPollPublic(v.id, sessionUser?.id),
      },
    })
  })

  function mapVideoRow(v, viewerUserId) {
    const chapters = getVideoChapters(v.id)
    return {
    id: v.id,
    title: v.title,
    description: v.description,
    channel: v.channel_name,
    userId: v.user_id,
    views: v.views,
    duration: displayDuration(v),
    durationSec: v.duration_sec,
    thumb: thumbUrl(v),
    createdAt: v.created_at,
    privacy: v.privacy || 'public',
    isLive: v.status === 'live',
    subtitleLanguage: v.subtitle_language || 'en',
    inWatchLater: viewerUserId ? isInWatchLater(viewerUserId, v.id) : false,
    chapterCount: chapters.length,
    hasPoll: Boolean(getVideoPollPublic(v.id)?.question),
  }
  }

  app.get('/api/notifications', requireAuth, (req, res) => {
  res.json({
    notifications: listNotifications(req.user.id),
    unreadCount: unreadNotificationCount(req.user.id),
  })
})

app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  markAllNotificationsRead(req.user.id)
  res.json({ ok: true, unreadCount: 0 })
})

app.post('/api/notifications/:id/read', requireAuth, (req, res) => {
  const ok = markNotificationRead(req.user.id, req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true, unreadCount: unreadNotificationCount(req.user.id) })
})

app.get('/api/channels/:userId', (req, res) => {
  const sessionUser = getUserFromSession(req)
  const channel = getPublicChannel(req.params.userId, sessionUser?.id)
  if (!channel) return res.status(404).json({ error: 'Channel not found' })
  const subscribed = sessionUser ? isSubscribed(sessionUser.id, req.params.userId) : false
  res.json({ channel: { ...channel, subscribed } })
})

app.get('/api/channels/:userId/videos', (req, res) => {
  const sessionUser = getUserFromSession(req)
  const rows = listChannelVideos(req.params.userId, sessionUser?.id)
  res.json({ videos: rows.map((v) => mapVideoRow(v, sessionUser?.id)) })
  })

  app.get('/api/channels/:userId/comments', (req, res) => {
  const sessionUser = getUserFromSession(req)
  const channel = getPublicChannel(req.params.userId, sessionUser?.id)
  if (!channel) return res.status(404).json({ error: 'Channel not found' })
  res.json({ comments: listChannelCommentFeed(req.params.userId, sessionUser?.id) })
})

app.patch('/api/channels/me/theme', requireAuth, (req, res) => {
  const theme = setChannelTheme(req.user.id, req.body || {})
  if (!theme) return res.status(404).json({ error: 'Channel not found' })
  res.json({ theme })
})

app.patch('/api/channels/me/announcement', requireAuth, (req, res) => {
  const announcement = setChannelAnnouncement(req.user.id, req.body || {})
  res.json({ announcement })
})

app.get('/api/live/streams', (req, res) => {
  const sessionUser = getUserFromSession(req)
  const rows = listActiveLiveStreams()
    .map((s) => getVideoById(s.video_id))
    .filter((v) => v && canViewVideo(v, sessionUser?.id))
  res.json({ videos: rows.map((v) => mapVideoRow(v, sessionUser?.id)) })
  })

  app.get('/api/live/me', requireAuth, (req, res) => {
  const stream = getActiveLiveStreamForUser(req.user.id)
  if (!stream) return res.json({ live: null })
  const v = getVideoById(stream.video_id)
  res.json({
    live: {
      streamId: stream.id,
      videoId: stream.video_id,
      title: stream.title,
      startedAt: stream.started_at,
      video: v ? mapVideoRow(v, req.user.id) : null,
    },
  })
})

app.post('/api/live/start', requireAuth, (req, res) => {
  const result = startLiveStream(req.user.id, {
    title: req.body?.title,
    description: req.body?.description,
  })
  if (result.error === 'already_live') {
    return res.status(409).json({
      error: 'Already live',
      videoId: result.stream.video_id,
    })
  }
  res.status(201).json(result)
})

app.post('/api/live/stop', requireAuth, (req, res) => {
  const stream = stopLiveStream(req.user.id)
  if (!stream) return res.status(404).json({ error: 'No active live stream' })
  res.json({ ok: true, videoId: stream.video_id })
})

function assertLiveVideo(req, res) {
  const v = getVideoById(req.params.videoId)
  if (!v || v.status !== 'live') {
    res.status(404).json({ error: 'Not live' })
    return null
  }
  const sessionUser = getUserFromSession(req)
  if (!canViewVideo(v, sessionUser?.id)) {
    res.status(404).json({ error: 'Not found' })
    return null
  }
  return { v, sessionUser }
}

app.post('/api/live/:videoId/webrtc/broadcaster/register', requireAuth, (req, res) => {
  const ctx = assertLiveVideo(req, res)
  if (!ctx) return
  if (ctx.v.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
  touchBroadcaster(req.params.videoId, req.user.id)
  res.json({ ok: true })
})

app.get('/api/live/:videoId/webrtc/broadcaster/events', requireAuth, (req, res) => {
  const ctx = assertLiveVideo(req, res)
  if (!ctx) return
  if (ctx.v.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
  touchBroadcaster(req.params.videoId, req.user.id)
  const joins = drainJoinQueue(req.params.videoId)
  const signals = drainAllBroadcasterSignals(req.params.videoId)
  res.json({ joins, signals })
})

app.post('/api/live/:videoId/webrtc/broadcaster/signal', requireAuth, (req, res) => {
  const ctx = assertLiveVideo(req, res)
  if (!ctx) return
  if (ctx.v.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
  const peerId = req.body?.peerId
  if (!peerId) return res.status(400).json({ error: 'peerId required' })
  const ok = pushToViewer(req.params.videoId, peerId, {
    type: req.body?.type,
    sdp: req.body?.sdp,
    candidate: req.body?.candidate,
  })
  if (!ok) return res.status(404).json({ error: 'Unknown viewer' })
  res.json({ ok: true })
})

app.post('/api/live/:videoId/webrtc/viewer/join', (req, res) => {
  const ctx = assertLiveVideo(req, res)
  if (!ctx) return
  const { peerId } = viewerJoinLive(req.params.videoId)
  res.json({ peerId })
})

app.get('/api/live/:videoId/webrtc/viewer/:peerId/signals', (req, res) => {
  const ctx = assertLiveVideo(req, res)
  if (!ctx) return
  const messages = drainViewerSignals(req.params.videoId, req.params.peerId)
  res.json({ messages })
})

app.post('/api/live/:videoId/webrtc/viewer/:peerId/signal', (req, res) => {
  const ctx = assertLiveVideo(req, res)
  if (!ctx) return
  const ok = pushToBroadcaster(req.params.videoId, req.params.peerId, {
    type: req.body?.type,
    sdp: req.body?.sdp,
    candidate: req.body?.candidate,
  })
  if (!ok) return res.status(404).json({ error: 'Unknown session' })
  res.json({ ok: true })
})

app.get('/api/watch-later', requireAuth, (req, res) => {
  res.json({ queue: listWatchLater(req.user.id) })
})

app.post('/api/watch-later', requireAuth, (req, res) => {
  const videoId = req.body?.videoId
  if (!videoId) return res.status(400).json({ error: 'videoId required' })
  const result = addWatchLater(req.user.id, videoId)
  if (result.error) return res.status(404).json({ error: 'Video not found' })
  res.status(201).json({ ok: true })
})

app.delete('/api/watch-later/:videoId', requireAuth, (req, res) => {
  const ok = removeWatchLater(req.user.id, req.params.videoId)
  if (!ok) return res.status(404).json({ error: 'Not in queue' })
  res.json({ ok: true })
})

app.put('/api/watch-later/reorder', requireAuth, (req, res) => {
  const ok = reorderWatchLater(req.user.id, req.body?.videoIds)
  if (!ok) return res.status(400).json({ error: 'Invalid order' })
  res.json({ queue: listWatchLater(req.user.id) })
})

app.patch('/api/videos/:id/privacy', requireAuth, (req, res) => {
  const privacy = req.body?.privacy
  const updated = setVideoPrivacy(req.params.id, req.user.id, privacy)
  if (!updated) return res.status(400).json({ error: 'Cannot update privacy' })
  res.json({ privacy: updated.privacy || 'public' })
})

app.put('/api/videos/:id/chapters', requireAuth, (req, res) => {
  const chapters = setVideoChapters(req.params.id, req.user.id, req.body?.chapters)
  if (chapters === null) return res.status(400).json({ error: 'Cannot update chapters' })
  res.json({ chapters })
})

app.put('/api/videos/:id/poll', requireAuth, (req, res) => {
  const body = req.body || {}
  const poll = setVideoPoll(req.params.id, req.user.id, body)
  if (poll === null && body.question && Array.isArray(body.options) && body.options.filter(Boolean).length >= 2) {
    return res.status(400).json({ error: 'Cannot update poll' })
  }
  res.json({ poll })
})

app.get('/api/videos/:id/poll', (req, res) => {
  const sessionUser = getUserFromSession(req)
  const v = getVideoById(req.params.id)
  if (!v || !canViewVideo(v, sessionUser?.id)) return res.status(404).json({ error: 'Not found' })
  res.json({ poll: getVideoPollPublic(v.id, sessionUser?.id) })
})

app.post('/api/videos/:id/poll/vote', requireAuth, (req, res) => {
  const v = getVideoById(req.params.id)
  if (!v || !canViewVideo(v, req.user.id)) return res.status(404).json({ error: 'Not found' })
  const result = voteVideoPoll(v.id, req.user.id, req.body?.optionId)
  if (result.error) return res.status(400).json({ error: result.error })
  res.json(result)
})

app.get('/api/videos/:id/download', requireAuth, (req, res) => {
  const v = getVideoById(req.params.id)
  if (!v || !canViewVideo(v, req.user.id)) return res.status(404).json({ error: 'Not found' })
  if (v.status !== 'ready') return res.status(409).json({ error: 'Video not ready' })

  const variants = getVariants(v.id)
  const original = variants.find((vr) => vr.label === 'original')
  if (!original?.file_path) return res.status(404).json({ error: 'Original file not available' })

  const abs = path.isAbsolute(original.file_path)
    ? original.file_path
    : path.join(root, original.file_path)
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'File not found' })

  const ext = path.extname(abs) || '.mp4'
  const safeTitle =
    (v.title || 'video')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'video'
  res.download(abs, `${safeTitle}${ext}`)
})

app.get('/api/videos/:id/comments', (req, res) => {
  const v = getVideoById(req.params.id)
  const sessionUser = getUserFromSession(req)
  if (!v || !canViewVideo(v, sessionUser?.id)) {
    return res.status(404).json({ error: 'Video not found' })
  }
  res.json({ comments: listComments(req.params.id, sessionUser?.id) })
  })

  app.post('/api/comments/:commentId/vote', requireAuth, (req, res) => {
  const direction = req.body.direction === 'down' ? 'down' : req.body.direction === 'up' ? 'up' : null
  if (!direction) return res.status(400).json({ error: 'direction must be up or down' })
  const comment = getCommentById(req.params.commentId)
  if (!comment) return res.status(404).json({ error: 'Comment not found' })
  const v = getVideoById(comment.video_id)
  if (!v || !canViewVideo(v, req.user.id)) {
    return res.status(404).json({ error: 'Comment not found' })
  }
  const row = setCommentVote(req.params.commentId, req.user.id, direction)
  res.json({ comment: row })
  })

  app.post('/api/videos/:id/comments', requireAuth, (req, res) => {
  const body = (req.body.body || '').trim()
  if (!body) return res.status(400).json({ error: 'Comment required' })
  const v = getVideoById(req.params.id)
  if (!v || !canViewVideo(v, req.user.id)) return res.status(404).json({ error: 'Video not found' })

  const parentId = req.body.parentId || null
  const id = randomUUID()
  const row = addComment({ id, videoId: req.params.id, userId: req.user.id, body, parentId })
  if (!row) return res.status(400).json({ error: 'Invalid parent comment' })

  res.status(201).json({ comment: { ...row, replies: [] } })
})

app.get('/api/feed/subscriptions', requireAuth, (req, res) => {
  const rows = listSubscribedFeedVideos(req.user.id)
  res.json({
    videos: rows.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      channel: v.channel_name,
      userId: v.user_id,
      views: v.views,
      duration: formatDuration(v.duration_sec),
      durationSec: v.duration_sec,
      thumb: thumbUrl(v),
      createdAt: v.created_at,
    })),
  })
})

app.get('/api/subscriptions/channels', requireAuth, (req, res) => {
  res.json({ channels: listSubscribedChannels(req.user.id) })
})

  app.post('/api/channels/:userId/subscription', requireAuth, (req, res) => {
  const subscribe = req.body.subscribe !== false
  const ok = setSubscription(req.user.id, req.params.userId, subscribe)
  if (!ok) return res.status(400).json({ error: 'Cannot subscribe to this channel' })
  res.json({ subscribed: isSubscribed(req.user.id, req.params.userId) })
  })

  app.get('/api/history', requireAuth, (req, res) => {
  res.json({ history: listWatchHistory(req.user.id) })
  })

  app.post('/api/history', requireAuth, (req, res) => {
  const videoId = req.body.videoId
  if (!videoId || !videoExists(videoId)) return res.status(400).json({ error: 'Invalid video' })
  recordWatchHistory(req.user.id, videoId, req.body.positionSec)
  res.json({ ok: true })
  })

  const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const id = req.videoId
      const dir = path.join(storageDir, id)
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname) || '.mp4'
      cb(null, `original${ext}`)
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
})

app.post('/api/videos/upload', requireAuth, (req, res, next) => {
  req.videoId = randomUUID()
  next()
}, upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file' })
  const title = (req.body.title || 'Untitled').trim() || 'Untitled'
  const description = (req.body.description || '').trim()
  const privacy = req.body.privacy || 'public'

  createVideo({ id: req.videoId, userId: req.user.id, title, description, privacy })

  res.status(201).json({ id: req.videoId, status: 'processing' })

  processVideo(req.videoId).catch((err) => {
    console.error('Processing failed', req.videoId, err)
    setVideoFailed(req.videoId)
  })
})

app.get('/api/setup/login-url', (req, res) => {
  const user = getUserById(DEFAULT_USER_ID)
  res.json({
    url: `${PUBLIC_WEB_ORIGIN}/login/${user.magic_login_token}`,
    apiUrl: `${PUBLIC_WEB_ORIGIN}/api/auth/magic/${user.magic_login_token}`,
  })
})

const seedResult = ensureDemoSeed()
if (!seedResult.skipped) {
  console.log('Demo seed: 10 switch personas, 100 channels, videos, and subscriptions.')
}

app.listen(PORT, () => {
  console.log(`API server http://localhost:${PORT}`)
})
