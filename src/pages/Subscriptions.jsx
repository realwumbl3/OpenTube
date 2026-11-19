import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import VideoCard from '../components/VideoCard'
import { listSubscriptionFeed, listSubscribedChannels } from '../api'
import { useAuth } from '../context/AuthContext'
import { formatViews } from '../utils/format'

export default function Subscriptions() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'channels' ? 'channels' : 'videos'
  const [videos, setVideos] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      setVideos([])
      setChannels([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([listSubscriptionFeed(), listSubscribedChannels()])
      .then(([feed, subs]) => {
        if (cancelled) return
        setVideos(feed.videos || [])
        setChannels(subs.channels || [])
      })
      .catch((err) => {
        if (!cancelled) {
          setVideos([])
          setChannels([])
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) {
    return (
      <Layout>
        <div className="empty-state">
          <h2>Subscriptions</h2>
          <p>Sign in to see new videos from channels you follow.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <header className="page-head">
        <h1>Subscriptions</h1>
        <p className="stats">
          {channels.length > 0
            ? `${channels.length} channel${channels.length === 1 ? '' : 's'} · latest uploads`
            : 'Subscribe to channels to see their uploads here'}
        </p>
      </header>
      <nav className="channel-page__tabs" aria-label="Subscription sections">
        <button
          type="button"
          className={`channel-page__tab${tab === 'videos' ? ' channel-page__tab--active' : ''}`}
          onClick={() => setSearchParams({})}
        >
          All videos
        </button>
        <button
          type="button"
          className={`channel-page__tab${tab === 'channels' ? ' channel-page__tab--active' : ''}`}
          onClick={() => setSearchParams({ tab: 'channels' })}
        >
          All channels
        </button>
      </nav>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : tab === 'channels' ? (
        channels.length === 0 ? (
          <div className="empty-state">
            <h2>No subscriptions yet</h2>
            <p>Channels you subscribe to appear here with quick links to their pages.</p>
            <Link className="text-link" to="/">
              Browse home
            </Link>
          </div>
        ) : (
          <section className="subs-channel-grid" aria-label="Subscribed channels">
            {channels.map((ch) => (
              <Link key={ch.id} to={`/channel/${ch.id}`} className="subs-channel-card">
                <div className="channel-avatar channel-letter subs-channel-card__avatar">
                  {ch.displayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="subs-channel-card__name">{ch.displayName}</span>
                <span className="stats">@{ch.username}</span>
                <span className="stats">
                  {formatViews(ch.stats?.videoCount || 0)} videos ·{' '}
                  {formatViews(ch.stats?.totalViews || 0)} views
                </span>
              </Link>
            ))}
          </section>
        )
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <h2>No subscription videos yet</h2>
          <p>Subscribe to a channel on its watch page, then new uploads appear here in order.</p>
          {channels.length > 0 ? (
            <button
              type="button"
              className="text-link text-btn"
              onClick={() => setSearchParams({ tab: 'channels' })}
            >
              View your {channels.length} subscriptions
            </button>
          ) : (
            <Link className="text-link" to="/">
              Browse home
            </Link>
          )}
        </div>
      ) : (
        <section className="video-grid">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </section>
      )}
    </Layout>
  )
}
