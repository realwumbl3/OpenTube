import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVideo, setVideoPrivacy } from '../api'
import VideoChapterEditor from './VideoChapterEditor'
import VideoPollEditor from './VideoPollEditor'

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'chapters', label: 'Chapters' },
  { id: 'poll', label: 'Community poll' },
]

export default function VideoStudioEditor({ videoId, initialTab = 'details', onClose, onUpdated }) {
  const [tab, setTab] = useState(initialTab)
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [privacy, setPrivacy] = useState('public')
  const [privacySaving, setPrivacySaving] = useState(false)
  const [privacyError, setPrivacyError] = useState('')
  const [savedHint, setSavedHint] = useState('')

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab, videoId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getVideo(videoId)
      .then((d) => {
        if (cancelled) return
        setVideo(d.video)
        setPrivacy(d.video?.privacy || 'public')
      })
      .catch(() => {
        if (!cancelled) setVideo(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [videoId])

  function flashSaved(message) {
    setSavedHint(message)
    onUpdated?.()
    setTimeout(() => setSavedHint(''), 3500)
  }

  async function savePrivacy(next) {
    setPrivacy(next)
    setPrivacyError('')
    setPrivacySaving(true)
    try {
      await setVideoPrivacy(videoId, next)
      flashSaved('Visibility updated')
      setVideo((v) => (v ? { ...v, privacy: next } : v))
    } catch (err) {
      setPrivacyError(err.message || 'Could not update visibility')
      setPrivacy(video?.privacy || 'public')
    } finally {
      setPrivacySaving(false)
    }
  }

  const readyForChapters = Boolean(
    video && (video.durationSec != null || video.status === 'ready') && !video.isLive,
  )

  return (
    <div className="studio-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="studio-modal studio-modal--wide studio-modal--editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-studio-editor-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <header className="studio-modal__head">
          <div>
            <p className="studio-editor__eyebrow">Edit video</p>
            <h2 id="video-studio-editor-title">{video?.title || 'Loading…'}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <nav className="studio-editor-tabs" aria-label="Edit sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`studio-editor-tabs__btn${tab === t.id ? ' studio-editor-tabs__btn--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {savedHint ? <p className="studio-editor-saved" role="status">{savedHint}</p> : null}

        {loading ? (
          <p className="studio-panel__loading">Loading video details…</p>
        ) : !video ? (
          <p className="form-error">Could not load this video.</p>
        ) : (
          <div className="studio-editor-panel">
            {tab === 'details' ? (
              <div className="studio-editor-details">
                <p className="studio-hint">
                  Set visibility here. Use the <strong>Chapters</strong> and <strong>Community poll</strong> tabs to add
                  clickable segments and viewer polls on the watch page.
                </p>
                <label className="studio-field">
                  <span>Visibility</span>
                  <select
                    value={privacy}
                    disabled={privacySaving}
                    onChange={(e) => savePrivacy(e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </label>
                {privacyError ? <p className="form-error">{privacyError}</p> : null}
                <div className="studio-editor-details__meta">
                  <p>
                    Chapters:{' '}
                    <strong>{video.chapters?.length ? `${video.chapters.length} saved` : 'None yet'}</strong>
                  </p>
                  <p>
                    Poll:{' '}
                    <strong>{video.poll?.question ? 'Active' : 'None yet'}</strong>
                  </p>
                </div>
                <Link to={`/watch/${video.id}`} className="creator-studio__btn creator-studio__btn--ghost">
                  Open watch page
                </Link>
              </div>
            ) : null}

            {tab === 'chapters' ? (
              readyForChapters ? (
                <VideoChapterEditor
                  embedded
                  video={video}
                  onClose={onClose}
                  onSaved={(chapters) => {
                    setVideo((v) => (v ? { ...v, chapters } : v))
                    flashSaved('Chapters saved')
                  }}
                />
              ) : (
                <p className="studio-hint">
                  Chapters are available after the video finishes processing and has a duration.
                </p>
              )
            ) : null}

            {tab === 'poll' ? (
              <VideoPollEditor
                embedded
                video={video}
                onClose={onClose}
                onSaved={(poll) => {
                  setVideo((v) => (v ? { ...v, poll } : v))
                  flashSaved(poll?.question ? 'Poll saved' : 'Poll removed')
                }}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
