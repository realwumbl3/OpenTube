import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import VideoCard from '../components/VideoCard'
import {
  getChannel,
  getChannelVideos,
  getChannelComments,
  setChannelSubscription,
  updateChannelTheme,
} from '../api'
import { useAuth } from '../context/AuthContext'
import { formatRelativeTime, formatViews } from '../utils/format'

const FONT_OPTIONS = [
  { value: 'system-ui, sans-serif', label: 'System' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Segoe UI", sans-serif', label: 'Segoe UI' },
  { value: 'monospace', label: 'Monospace' },
]

export default function Channel() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [channel, setChannel] = useState(null)
  const [videos, setVideos] = useState([])
  const [subscribed, setSubscribed] = useState(false)
  const [themeDraft, setThemeDraft] = useState(null)
  const [savingTheme, setSavingTheme] = useState(false)
  const [tab, setTab] = useState('videos')
  const [feedComments, setFeedComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)

  useEffect(() => {
    getChannel(userId)
      .then((d) => {
        setChannel(d.channel)
        setSubscribed(!!d.channel?.subscribed)
        setThemeDraft(d.channel?.theme)
      })
      .catch(() => setChannel(null))
    getChannelVideos(userId)
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]))
  }, [userId])

  useEffect(() => {
    if (tab !== 'comments') return
    setLoadingComments(true)
    getChannelComments(userId)
      .then((d) => setFeedComments(d.comments || []))
      .catch(() => setFeedComments([]))
      .finally(() => setLoadingComments(false))
  }, [userId, tab])

  const isOwnChannel = Boolean(
    channel && user && (channel.isOwner || String(user.id) === String(userId))
  )

  async function toggleSubscribe() {
    if (!user || isOwnChannel) return
    const next = !subscribed
    setSubscribed(next)
    try {
      const data = await setChannelSubscription(userId, next)
      setSubscribed(!!data.subscribed)
    } catch {
      setSubscribed(!next)
    }
  }

  async function saveTheme(e) {
    e.preventDefault()
    if (!channel?.isOwner || !themeDraft) return
    setSavingTheme(true)
    try {
      const { theme } = await updateChannelTheme(themeDraft)
      setChannel((c) => ({ ...c, theme }))
      setThemeDraft(theme)
    } catch {
      /* ignore */
    } finally {
      setSavingTheme(false)
    }
  }

  if (!channel) {
    return (
      <Layout>
        <p className="empty-state">Channel not found.</p>
        <Link className="text-link" to="/">
          Back home
        </Link>
      </Layout>
    )
  }

  const theme = channel.theme || {}
  const layoutList = (channel.isOwner ? themeDraft?.layout : theme.layout) === 'list'

  return (
    <Layout>
      <div
        className="channel-page"
        style={{
          backgroundColor: theme.bgColor,
          fontFamily: theme.fontFamily,
        }}
      >
        <header className="channel-page__header">
          <div className="channel-avatar channel-letter channel-page__avatar">
            {channel.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="channel-page__info">
            <h1 className="channel-page__title">{channel.displayName}</h1>
            <p className="stats">
              @{channel.username} · {formatViews(channel.stats?.videoCount || 0)} videos ·{' '}
              {formatViews(channel.stats?.totalViews || 0)} views
            </p>
            {channel.badges?.length > 0 ? (
              <ul className="channel-badges" aria-label="Channel badges">
                {channel.badges.map((b) => (
                  <li key={b.id} className="channel-badge">
                    {b.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {user && !isOwnChannel ? (
            <button
              type="button"
              className={`subscribe-btn${subscribed ? ' subscribed' : ''}`}
              onClick={toggleSubscribe}
            >
              {subscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          ) : null}
        </header>

        {channel.isOwner ? (
          <section className="channel-customizer" aria-labelledby="theme-heading">
            <h2 id="theme-heading">Channel theme</h2>
            <form className="channel-theme-form" onSubmit={saveTheme}>
              <label>
                Background color
                <input
                  type="color"
                  value={themeDraft?.bgColor || '#0f0f0f'}
                  onChange={(e) => setThemeDraft((t) => ({ ...t, bgColor: e.target.value }))}
                />
              </label>
              <label>
                Font
                <select
                  value={themeDraft?.fontFamily || 'system-ui, sans-serif'}
                  onChange={(e) => setThemeDraft((t) => ({ ...t, fontFamily: e.target.value }))}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Layout
                <select
                  value={themeDraft?.layout || 'grid'}
                  onChange={(e) => setThemeDraft((t) => ({ ...t, layout: e.target.value }))}
                >
                  <option value="grid">Grid</option>
                  <option value="list">List</option>
                </select>
              </label>
              <button type="submit" className="btn-primary" disabled={savingTheme}>
                {savingTheme ? 'Saving…' : 'Save theme'}
              </button>
            </form>
          </section>
        ) : null}

        <nav className="channel-page__tabs" aria-label="Channel sections">
          <button
            type="button"
            className={`channel-page__tab${tab === 'videos' ? ' channel-page__tab--active' : ''}`}
            onClick={() => setTab('videos')}
          >
            Videos
          </button>
          <button
            type="button"
            className={`channel-page__tab${tab === 'comments' ? ' channel-page__tab--active' : ''}`}
            onClick={() => setTab('comments')}
          >
            Comments
          </button>
        </nav>

        {tab === 'videos' ? (
          <section className="channel-page__videos">
            {videos.length === 0 ? (
              <p className="empty-state">No videos on this channel yet.</p>
            ) : (
              <div className={layoutList ? 'video-list' : 'video-grid'}>
                {videos.map((v) => (
                  <VideoCard key={v.id} video={v} list={layoutList} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="channel-page__comments">
            <p className="channel-page__comments-lead">
              All comments on this channel public videos, newest first.
            </p>
            {loadingComments ? (
              <p className="empty-state">Loading comments…</p>
            ) : feedComments.length === 0 ? (
              <p className="empty-state">No comments yet.</p>
            ) : (
              <ul className="comment-list channel-comment-feed">
                {feedComments.map((c) => (
                  <li key={c.id} className="comment-item channel-comment-feed__item">
                    <div className="channel-avatar channel-letter comment-avatar">
                      {c.author?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="comment-item__body">
                      <Link
                        to={`/watch/${c.videoId}?c=${c.id}`}
                        className="channel-comment-feed__video"
                      >
                        {c.videoTitle}
                      </Link>
                      <p className="comment-author">
                        {c.author}
                        <span className="stats"> · {formatRelativeTime(c.created_at)}</span>
                        <span className="stats"> · {c.score ?? 0} points</span>
                      </p>
                      {c.replyToAuthor ? (
                        <p className="channel-comment-feed__reply-hint">
                          Reply to {c.replyToAuthor}
                        </p>
                      ) : null}
                      <p className="comment-body">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {channel.isOwner ? (
          <p className="channel-page__studio-link">
            <button type="button" className="text-btn" onClick={() => navigate('/upload')}>
              Upload a video
            </button>
          </p>
        ) : null}
      </div>
    </Layout>
  )
}
