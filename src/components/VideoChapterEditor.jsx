import { useEffect, useState } from 'react'
import { updateVideoChapters } from '../api'
import { formatTimestamp, parseTimestampInput } from '../utils/format'

function emptyRow() {
  return { time: '', title: '' }
}

export default function VideoChapterEditor({ video, onClose, onSaved, embedded = false }) {
  const [rows, setRows] = useState([emptyRow()])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const chapters = video?.chapters || []
    if (chapters.length) {
      setRows(
        chapters.map((c) => ({
          time: formatTimestamp(c.startSec),
          title: c.title,
        })),
      )
    } else {
      setRows([{ time: '0:00', title: '' }])
    }
  }, [video])

  function setRow(i, patch) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(i) {
    setRows((prev) => (prev.length <= 1 ? [emptyRow()] : prev.filter((_, j) => j !== i)))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const maxSec = video?.durationSec
    const chapters = []
    for (const row of rows) {
      const title = row.title.trim()
      if (!title) continue
      const startSec = parseTimestampInput(row.time)
      if (!Number.isFinite(startSec) || startSec < 0) {
        setError(`Invalid timestamp: ${row.time || '(empty)'}`)
        return
      }
      if (maxSec != null && startSec > maxSec) {
        setError(`Chapter "${title}" is past the video duration.`)
        return
      }
      chapters.push({ startSec: Math.floor(startSec), title })
    }
    chapters.sort((a, b) => a.startSec - b.startSec)
    setSaving(true)
    try {
      const data = await updateVideoChapters(video.id, chapters)
      onSaved?.(data.chapters || [])
      if (!embedded) onClose()
    } catch (err) {
      setError(err.message || 'Could not save chapters')
    } finally {
      setSaving(false)
    }
  }

  const form = (
        <form className="studio-modal__body" onSubmit={onSubmit}>
          <p className="studio-hint">
            Add timestamps (m:ss or h:mm:ss) and titles. Viewers get a clickable chapter list on the watch page.
          </p>
          <ul className="chapter-editor-list">
            {rows.map((row, i) => (
              <li key={i} className="chapter-editor-row">
                <input
                  type="text"
                  className="chapter-editor-row__time"
                  placeholder="0:00"
                  value={row.time}
                  onChange={(e) => setRow(i, { time: e.target.value })}
                  aria-label={`Chapter ${i + 1} time`}
                />
                <input
                  type="text"
                  className="chapter-editor-row__title"
                  placeholder="Chapter title"
                  value={row.title}
                  maxLength={100}
                  onChange={(e) => setRow(i, { title: e.target.value })}
                  aria-label={`Chapter ${i + 1} title`}
                />
                <button type="button" className="text-btn" onClick={() => removeRow(i)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="creator-studio__btn creator-studio__btn--ghost" onClick={addRow}>
            Add chapter
          </button>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="studio-modal__foot">
            {!embedded ? (
              <button
                type="button"
                className="creator-studio__btn creator-studio__btn--ghost"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
            ) : null}
            <button type="submit" className="creator-studio__btn creator-studio__btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save chapters'}
            </button>
          </div>
          </form>
    )

    if (embedded) return form

    return (
      <div className="studio-modal-backdrop" role="presentation" onClick={onClose}>
        <div
          className="studio-modal studio-modal--wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chapter-editor-title"
          onClick={(ev) => ev.stopPropagation()}
        >
          <header className="studio-modal__head">
          <h2 id="chapter-editor-title">Chapter markers — {video?.title}</h2>
          <button type="button" className="text-btn" onClick={onClose}>
            Close
          </button>
          </header>
          {form}
        </div>
      </div>
    )
  }
