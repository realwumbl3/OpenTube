import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import CreatorStudioShell from '../components/CreatorStudioShell'
import VideoStudioEditor from '../components/VideoStudioEditor'
import { getChannelVideos, uploadVideo } from '../api'
import { useAuth } from '../context/AuthContext'
import { formatRelativeTime, formatViews } from '../utils/format'

function videoStatus(video) {
  if (video.isLive) return 'Live'
  if (video.duration || video.thumb) return 'Published'
  return 'Processing'
}

export default function Upload() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(searchParams.get('upload') === '1')
  const [editTarget, setEditTarget] = useState(null)

  useEffect(() => {
    if (searchParams.get('upload') === '1') setUploadOpen(true)
    const editId = searchParams.get('edit')
    if (editId) {
      setEditTarget({ videoId: editId, tab: searchParams.get('tab') || 'details' })
    }
  }, [searchParams])

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    setLoading(true)
    getChannelVideos(user.id)
      .then((d) => {
        if (!cancelled) setVideos(d.videos || [])
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

  function openUploadModal() {
    setUploadOpen(true)
    setSearchParams({ upload: '1' }, { replace: true })
  }

  function closeUploadModal() {
    setUploadOpen(false)
    setSearchParams({}, { replace: true })
  }

  async function refreshVideos() {
    if (!user) return
    const d = await getChannelVideos(user.id)
    setVideos(d.videos || [])
  }

  if (!user) {
    return (
      <Layout>
        <p className="empty-state">Sign in with the default account link before opening Creator studio.</p>
      </Layout>
    )
  }

  return (
    <Layout wide hideSidebar>
      <CreatorStudioShell
        title="Channel content"
        subtitle="Manage uploads, visibility, and performance for your channel."
        activeRail="content"
        actions={
          <>
            <Link to="/go-live" className="creator-studio__btn creator-studio__btn--ghost">
              Go live
            </Link>
            <button type="button" className="creator-studio__btn creator-studio__btn--primary" onClick={openUploadModal}>
              Upload videos
            </button>
          </>
        }
      >
        <section className="studio-panel" aria-labelledby="studio-videos-head">
          <div className="studio-panel__head" id="studio-videos-head">
            <div>
              <h2>Your videos</h2>
              <p className="studio-sub studio-sub--hint">
                Select <strong>Edit video</strong> on any row to set chapters, community polls, and visibility.
              </p>
            </div>
            <p className="stats">{videos.length} item{videos.length === 1 ? '' : 's'}</p>
          </div>
          {loading ? (
            <p className="studio-panel__loading">Loading your library…</p>
          ) : videos.length === 0 ? (
            <div className="studio-empty">
              <p>No videos yet. Upload your first one or start a live stream.</p>
              <div className="studio-empty__actions">
                <button type="button" className="creator-studio__btn creator-studio__btn--primary" onClick={openUploadModal}>
                  Upload videos
                </button>
                <Link to="/go-live" className="creator-studio__btn creator-studio__btn--ghost">
                  Go live
                </Link>
              </div>
            </div>
          ) : (
            <div className="studio-table-wrap">
              <table className="studio-table">
                <thead>
                  <tr>
                    <th scope="col">Video</th>
                    <th scope="col">Extras</th>
                    <th scope="col">Visibility</th>
                    <th scope="col">Status</th>
                    <th scope="col">Views</th>
                    <th scope="col">Uploaded</th>
                    <th scope="col">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <Link to={`/watch/${v.id}`} className="studio-table__video">
                          {v.thumb ? (
                            <img src={v.thumb} alt="" className="studio-table__thumb" loading="lazy" />
                          ) : (
                            <span className="studio-table__thumb studio-table__thumb--placeholder" />
                          )}
                          <span className="studio-table__title">{v.title}</span>
                        </Link>
                      </td>
                      <td className="studio-table__extras">
                        {v.chapterCount > 0 ? (
                          <span className="studio-tag">{v.chapterCount} chapters</span>
                        ) : (
                          <span className="studio-tag studio-tag--muted">No chapters</span>
                        )}
                        {v.hasPoll ? (
                          <span className="studio-tag studio-tag--poll">Poll</span>
                        ) : null}
                      </td>
                      <td>
                        <span className={`studio-pill studio-pill--${v.privacy || 'public'}`}>{v.privacy || 'public'}</span>
                      </td>
                      <td>
                        <span className={`studio-pill${v.isLive ? ' studio-pill--live' : ''}`}>{videoStatus(v)}</span>
                      </td>
                      <td>{formatViews(v.views)}</td>
                      <td>{v.createdAt ? formatRelativeTime(v.createdAt) : '—'}</td>
                      <td className="studio-table__actions">
                        <button
                          type="button"
                          className="creator-studio__btn creator-studio__btn--primary studio-table__edit"
                          onClick={() => setEditTarget({ videoId: v.id, tab: 'details' })}
                        >
                          Edit video
                          </button>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </CreatorStudioShell>
      {editTarget ? (
        <VideoStudioEditor
          videoId={editTarget.videoId}
          initialTab={editTarget.tab}
          onClose={() => setEditTarget(null)}
          onUpdated={refreshVideos}
        />
      ) : null}
      {uploadOpen ? (
        <UploadModal
          onClose={closeUploadModal}
          onSuccess={async (id) => {
            closeUploadModal()
            await refreshVideos()
            navigate(`/watch/${id}`)
          }}
        />
      ) : null}
    </Layout>
  )
}

function UploadModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [privacy, setPrivacy] = useState('public')

  async function onSubmit(e) {
    e.preventDefault()
    if (!file) {
      setError('Choose a video file')
      return
    }
    setError('')
    setStatus('Uploading…')
    const fd = new FormData()
    fd.append('video', file)
    fd.append('title', title)
    fd.append('description', description)
    fd.append('privacy', privacy)
    try {
      const { id } = await uploadVideo(fd)
      setStatus('')
      onSuccess(id)
    } catch (err) {
      setError(err.message)
      setStatus('')
    }
  }

  function onFilePick(next) {
    setFile(next)
    if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, ''))
  }

  return (
    <div className="studio-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="studio-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-upload-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="studio-modal__head">
          <h2 id="studio-upload-title">Upload videos</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <UploadStudioForm
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          file={file}
          onFilePick={onFilePick}
          onSubmit={onSubmit}
          error={error}
          status={status}
          privacy={privacy}
          setPrivacy={setPrivacy}
          compact
        />
      </div>
    </div>
  )
}

function UploadStudioForm({
  title,
  setTitle,
  description,
  setDescription,
  file,
  onFilePick,
  onSubmit,
  error,
  status,
  privacy,
  setPrivacy,
  compact = false,
}) {
  const [drag, setDrag] = useState(false)

  return (
    <form className={`upload-form${compact ? ' upload-form--modal' : ''}`} onSubmit={onSubmit}>
      <div
        className={`drop-zone${drag ? ' drop-zone--active' : ''}${file ? ' drop-zone--has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          const f = e.dataTransfer.files?.[0]
          if (f?.type?.startsWith('video/')) onFilePick(f)
        }}
      >
        {file ? (
          <>
            <p className="drop-zone__name">{file.name}</p>
            <p className="stats">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
            <button type="button" className="text-btn" onClick={() => onFilePick(null)}>
              Remove
            </button>
          </>
        ) : (
          <>
            <p>Drag and drop a video file</p>
            <label className="btn-primary btn-primary--ghost">
              Select file
              <input
                type="file"
                accept="video/*"
                hidden
                onChange={(e) => onFilePick(e.target.files?.[0] || null)}
              />
            </label>
          </>
        )}
      </div>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={compact ? 4 : 5} />
      </label>
      <label>
        Visibility
        <select value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="private">Private</option>
        </select>
      </label>
      <p className="studio-sub studio-sub--hint">
        Public videos appear in feeds. Unlisted is link-only. Private is only visible to you.
      </p>
      {error && <p className="form-error">{error}</p>}
      {status && <p className="form-ok">{status}</p>}
      <button type="submit" className="creator-studio__btn creator-studio__btn--primary" disabled={!file || !!status}>
        {status ? 'Uploading…' : 'Publish'}
      </button>
    </form>
  )
}
