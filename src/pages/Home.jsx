import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import VideoCard from '../components/VideoCard'
import { Link } from 'react-router-dom'
import { getWatchLater, listLiveStreams, listVideos } from '../api'
import { useAuth } from '../context/AuthContext'
import { mapWatchLaterQueue } from '../utils/watchLater'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recently uploaded' },
  { id: 'live', label: 'Live' },
  { id: 'music', label: 'Music' },
  { id: 'gaming', label: 'Gaming' },
]

function SkeletonGrid() {
  return (
    <section className="video-grid" aria-busy="true" aria-label="Loading videos">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-thumb shimmer" />
          <div className="skeleton-meta">
            <div className="skeleton-avatar shimmer" />
            <div className="skeleton-lines">
              <div className="skeleton-line shimmer" />
              <div className="skeleton-line short shimmer" />
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}

export default function Home() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [videos, setVideos] = useState([])
  const [liveStreams, setLiveStreams] = useState([])
  const [watchLaterVideos, setWatchLaterVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const categoryChips = useMemo(() => {
    const chips = [...CATEGORIES]
    if (user) chips.splice(3, 0, { id: 'watch-later', label: 'Watch later' })
    return chips
  }, [user])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([listVideos(query), listLiveStreams().catch(() => ({ videos: [] }))])
      .then(([videoData, liveData]) => {
        if (cancelled) return
        const live = liveData.videos || []
        setLiveStreams(live)
        const byId = new Map((videoData.videos || []).map((v) => [v.id, v]))
        for (const v of live) {
          if (!byId.has(v.id)) byId.set(v.id, v)
          else byId.set(v.id, { ...byId.get(v.id), ...v, isLive: true })
        }
        setVideos([...byId.values()])
      })
      .catch(() => {
        if (!cancelled) {
          setVideos([])
          setLiveStreams([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  useEffect(() => {
    if (!user) {
      setWatchLaterVideos([])
      return undefined
    }
    let cancelled = false
    getWatchLater()
      .then((data) => {
        if (!cancelled) setWatchLaterVideos(mapWatchLaterQueue(data.queue))
      })
      .catch(() => {
        if (!cancelled) setWatchLaterVideos([])
      })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!user && category === 'watch-later') setCategory('all')
  }, [user, category])

  const filtered = useMemo(() => {
    if (category === 'watch-later') return watchLaterVideos
    if (category === 'all') return videos
    if (category === 'recent') {
      return [...videos].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    }
    if (category === 'live') return liveStreams.length ? liveStreams : videos.filter((v) => v.isLive)
    const kw = category
    return videos.filter(
      (v) =>
        v.title?.toLowerCase().includes(kw) ||
        v.description?.toLowerCase().includes(kw) ||
        v.channel?.toLowerCase().includes(kw)
    )
  }, [videos, category, liveStreams, watchLaterVideos])

  const liveNow = useMemo(
    () => (liveStreams.length ? liveStreams : videos.filter((v) => v.isLive)),
    [liveStreams, videos]
  )

  return (
    <Layout
      search={search}
      onSearchChange={setSearch}
      onSearchSubmit={() => setQuery(search.trim())}
    >
      <div className="chips chips--sticky" role="tablist" aria-label="Video categories">
        {categoryChips.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            className={`chip${category === c.id ? ' active' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {!loading && category !== 'watch-later' && category === 'all' && liveNow.length > 0 ? (
        <section className="home-live-now" aria-label="Live now">
          <div className="home-live-now__head">
            <h2>Live now</h2>
            <button type="button" className="chip chip--sm" onClick={() => setCategory('live')}>
              See all
            </button>
          </div>
          <div className="video-grid video-grid--live-now">
            {liveNow.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      ) : null}
      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h2>
            {category === 'live'
              ? 'No live streams right now'
              : category === 'watch-later'
                ? 'Nothing saved for later'
                : 'No videos yet'}
          </h2>
          <p>
            {category === 'live'
              ? user
                ? 'Start broadcasting from Go live in the sidebar or the Create menu.'
                : 'Sign in to go live or check back later.'
              : category === 'watch-later'
                ? 'Save videos with the clock on thumbnails, or open Watch later in the sidebar.'
                : 'Sign in with your default account link and upload the first one.'}
          </p>
          {category === 'live' && user ? (
            <Link to="/go-live" className="btn btn--primary home-live-cta">
              Go live
            </Link>
          ) : null}
        </div>
      ) : (
        <section className="video-grid">
          {filtered.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </section>
      )}
    </Layout>
  )
}
