import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import VideoCard from '../components/VideoCard'
import { getWatchLater, reorderWatchLater, removeFromWatchLater } from '../api'
import { useAuth } from '../context/AuthContext'
import { mapWatchLaterQueue } from '../utils/watchLater'

export default function WatchLater() {
  const { user } = useAuth()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const orderRef = useRef([])

  const refresh = useCallback(() => {
    if (!user) return Promise.resolve()
    setLoading(true)
    return getWatchLater()
      .then((data) => setVideos(mapWatchLaterQueue(data.queue)))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user) {
      setVideos([])
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    getWatchLater()
      .then((data) => {
        if (!cancelled) setVideos(mapWatchLaterQueue(data.queue))
      })
      .catch(() => {
        if (!cancelled) setVideos([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  async function persistOrder(nextVideos) {
    setVideos(nextVideos)
    setSavingOrder(true)
    try {
      const data = await reorderWatchLater(nextVideos.map((v) => v.id))
      setVideos(mapWatchLaterQueue(data.queue))
    } catch {
      await refresh()
    } finally {
      setSavingOrder(false)
    }
  }

  function onDragStart(id) {
    setDragId(id)
  }

  function onDragOver(e, overId) {
    e.preventDefault()
    if (!dragId || dragId === overId) return
    const from = videos.findIndex((v) => v.id === dragId)
    const to = videos.findIndex((v) => v.id === overId)
    if (from < 0 || to < 0) return
    const next = [...videos]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    orderRef.current = next
    setVideos(next)
  }

  async function onDragEnd() {
    const id = dragId
    setDragId(null)
    if (!id) return
    await persistOrder(orderRef.current)
  }

  async function remove(id) {
    try {
      await removeFromWatchLater(id)
      setVideos((prev) => prev.filter((v) => v.id !== id))
    } catch {
      await refresh()
    }
  }

  if (!user) {
    return (
      <Layout>
        <div className="empty-state">
          <h2>Watch later</h2>
          <p>Sign in to save videos and watch them when you are ready.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <header className="page-head">
        <h1>Watch later</h1>
        <p className="stats">
          {savingOrder ? 'Saving order…' : 'Drag rows to reorder your queue'}
        </p>
      </header>
      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <h2>Queue is empty</h2>
          <p>Use the clock on a thumbnail or the button on a watch page to save videos here.</p>
          <Link className="text-link" to="/">
            Browse videos
          </Link>
        </div>
      ) : (
        <ul className="watch-later-queue" aria-label="Watch later queue">
          {videos.map((video, index) => (
            <li
              key={video.id}
              className={`watch-later-queue__item${dragId === video.id ? ' watch-later-queue__item--drag' : ''}`}
              draggable
              onDragStart={() => onDragStart(video.id)}
              onDragOver={(e) => onDragOver(e, video.id)}
              onDragEnd={onDragEnd}
            >
              <span className="watch-later-queue__handle" aria-hidden title="Drag to reorder">
                ⋮⋮
              </span>
              <span className="watch-later-queue__index">{index + 1}</span>
              <div className="watch-later-queue__card">
                <VideoCard video={video} list />
              </div>
              <button
                type="button"
                className="text-btn watch-later-queue__remove"
                onClick={() => remove(video.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}
