import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import CreatorStudioShell from '../components/CreatorStudioShell'
import LiveCameraPreview from '../components/LiveCameraPreview'
import { getMyLiveStream, startLiveStream } from '../api'
import { useAuth } from '../context/AuthContext'

export default function GoLive() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeLive, setActiveLive] = useState(null)
  const [rehearsal, setRehearsal] = useState(true)

  useEffect(() => {
    if (!user) return
    getMyLiveStream()
      .then((d) => setActiveLive(d.live))
      .catch(() => setActiveLive(null))
  }, [user])

  useEffect(() => {
    if (activeLive?.videoId) {
      navigate(`/watch/${activeLive.videoId}`, { replace: true })
    }
  }, [activeLive?.videoId, navigate])

  if (!user) {
    return (
      <Layout>
        <div className="empty-state">
          <h2>Sign in to go live</h2>
          <p>Use your default account link from the profile menu.</p>
        </div>
      </Layout>
    )
  }

  async function onGoLive(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await startLiveStream({
        title: title.trim() || 'Live Stream',
        description: description.trim(),
      })
      const videoId = result.videoId
      setRehearsal(false)
      navigate(`/watch/${videoId}`)
    } catch (err) {
      if (err.status === 409 && err.data?.videoId) {
        navigate(`/watch/${err.data.videoId}`)
        return
      }
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout wide hideSidebar>
      <CreatorStudioShell
        title="Live streaming"
        subtitle="Rehearse camera and audio, then start a stream viewers can watch on the Live tab."
        activeRail="live"
      >
        <div className="go-live-layout">
          <LiveCameraPreview
            active={rehearsal}
            badge="Rehearsal — viewers cannot see this yet"
          />
          <form className="go-live-form" onSubmit={onGoLive}>
          <label>
            Stream title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Live Stream"
              maxLength={200}
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Tell viewers what this stream is about"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="creator-studio__btn creator-studio__btn--live" disabled={busy}>
            {busy ? 'Starting…' : 'Go live'}
          </button>
          </form>
          </div>
        </CreatorStudioShell>
      </Layout>
    )
  }
