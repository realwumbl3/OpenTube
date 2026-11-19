import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { getWatchHistory } from '../api'
import { useAuth } from '../context/AuthContext'
import { formatRelativeTime, formatTimestamp } from '../utils/format'

export default function History() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getWatchHistory()
      .then((data) => {
        if (!cancelled) setItems(data.history || [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
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
          <h2>Watch history</h2>
          <p>Sign in to keep track of videos you have watched.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <header className="page-head">
        <h1>Watch history</h1>
        <p className="stats">Videos you watched recently, with when you last viewed them</p>
      </header>
      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h2>No watch history</h2>
          <p>Open a video while signed in and it will show up here.</p>
          <Link className="text-link" to="/">
            Find something to watch
          </Link>
        </div>
      ) : (
        <ul className="history-list">
          {items.map((entry) => (
            <li key={`${entry.video.id}-${entry.watchedAt}`} className="history-item">
              <Link to={`/watch/${entry.video.id}`} className="history-item__link">
                <div className="thumb-wrap thumb-wrap--compact">
                  {entry.video.thumb ? (
                    <img src={entry.video.thumb} alt="" className="thumb" loading="lazy" />
                  ) : (
                    <div className="thumb thumb-placeholder" />
                  )}
                </div>
                <div className="history-item__meta">
                  <h3 className="title">{entry.video.title}</h3>
                  <p className="channel">{entry.video.channel}</p>
                  <p className="stats">
                    Watched {formatRelativeTime(entry.watchedAt)}
                    {entry.positionSec > 0
                      ? ` · stopped at ${formatTimestamp(entry.positionSec)}`
                      : ''}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}
