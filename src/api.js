// Same origin in dev (Vite :5173 proxies /api and /media to Express :3001).
const API = ''

export async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const getMe = () => api('/api/auth/me')
export const loginMagic = (token) =>
  api(`/api/auth/magic/${token}`, { method: 'POST' })
export const logout = () => api('/api/auth/logout', { method: 'POST' })
export const listSwitchableUsers = () => api('/api/auth/switchable')
export const switchAccount = (userId) => api(`/api/auth/switch/${userId}`, { method: 'POST' })
export const listVideos = (q) =>
  api(`/api/videos${q ? `?q=${encodeURIComponent(q)}` : ''}`)
export const getVideo = (id) => api(`/api/videos/${id}`)
export const getComments = (id) => api(`/api/videos/${id}/comments`)
export const postComment = (id, body, parentId = null) =>
  api(`/api/videos/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body, parentId }),
  })
export const voteComment = (commentId, direction) =>
  api(`/api/comments/${commentId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  })
export const listSubscriptionFeed = () => api('/api/feed/subscriptions')
export const listSubscribedChannels = () => api('/api/subscriptions/channels')
export const setChannelSubscription = (userId, subscribe) =>
  api(`/api/channels/${userId}/subscription`, {
    method: 'POST',
    body: JSON.stringify({ subscribe }),
  })
export const getWatchHistory = () => api('/api/history')
export const saveWatchProgress = (videoId, positionSec) =>
  api('/api/history', {
    method: 'POST',
    body: JSON.stringify({ videoId, positionSec }),
  })
export const uploadVideo = (formData) =>
  api('/api/videos/upload', { method: 'POST', body: formData })
export const getLoginUrl = () => api('/api/setup/login-url')
export const getNotifications = () => api('/api/notifications')
export const markNotificationRead = (id) =>
  api(`/api/notifications/${id}/read`, { method: 'POST' })
export const markAllNotificationsRead = () =>
  api('/api/notifications/read-all', { method: 'POST' })
export const getChannel = (userId) => api(`/api/channels/${userId}`)
export const getChannelVideos = (userId) => api(`/api/channels/${userId}/videos`)
export const getChannelComments = (userId) => api(`/api/channels/${userId}/comments`)
export const updateChannelTheme = (theme) =>
  api('/api/channels/me/theme', { method: 'PATCH', body: JSON.stringify(theme) })
export const setVideoPrivacy = (videoId, privacy) =>
  api(`/api/videos/${videoId}/privacy`, { method: 'PATCH', body: JSON.stringify({ privacy }) })

export const updateVideoChapters = (videoId, chapters) =>
  api(`/api/videos/${videoId}/chapters`, {
    method: 'PUT',
    body: JSON.stringify({ chapters }),
  })

export const updateVideoPoll = (videoId, poll) =>
  api(`/api/videos/${videoId}/poll`, { method: 'PUT', body: JSON.stringify(poll) })

export const getVideoPoll = (videoId) => api(`/api/videos/${videoId}/poll`)

export const voteVideoPoll = (videoId, optionId) =>
  api(`/api/videos/${videoId}/poll/vote`, {
    method: 'POST',
    body: JSON.stringify({ optionId }),
  })

/** Same-origin URL that streams the uploaded source file (requires session cookie). */
export const videoDownloadHref = (videoId) =>
  `/api/videos/${encodeURIComponent(videoId)}/download`

export const listLiveStreams = () => api('/api/live/streams')
export const getMyLiveStream = () => api('/api/live/me')
export const startLiveStream = ({ title, description }) =>
  api('/api/live/start', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  })
export const stopLiveStream = () => api('/api/live/stop', { method: 'POST' })

export const registerLiveBroadcaster = (videoId) =>
  api(`/api/live/${encodeURIComponent(videoId)}/webrtc/broadcaster/register`, {
    method: 'POST',
  })

export const pollLiveBroadcasterEvents = (videoId) =>
  api(`/api/live/${encodeURIComponent(videoId)}/webrtc/broadcaster/events`)

export const sendLiveBroadcasterSignal = (videoId, peerId, body) =>
  api(`/api/live/${encodeURIComponent(videoId)}/webrtc/broadcaster/signal`, {
    method: 'POST',
    body: JSON.stringify({ peerId, ...body }),
  })

export const joinLiveWebRTC = (videoId) =>
  api(`/api/live/${encodeURIComponent(videoId)}/webrtc/viewer/join`, { method: 'POST' })

export const pollLiveViewerSignals = (videoId, peerId) =>
  api(
    `/api/live/${encodeURIComponent(videoId)}/webrtc/viewer/${encodeURIComponent(peerId)}/signals`
  )

export const sendLiveViewerSignal = (videoId, peerId, body) =>
  api(`/api/live/${encodeURIComponent(videoId)}/webrtc/viewer/${encodeURIComponent(peerId)}/signal`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const addToWatchLater = (videoId) =>
  api('/api/watch-later', {
    method: 'POST',
    body: JSON.stringify({ videoId }),
  })
export const removeFromWatchLater = (videoId) =>
  api(`/api/watch-later/${encodeURIComponent(videoId)}`, { method: 'DELETE' })

export const getWatchLater = () => api('/api/watch-later')

export const reorderWatchLater = (videoIds) =>
  api('/api/watch-later/reorder', {
    method: 'PUT',
    body: JSON.stringify({ videoIds }),
  })
