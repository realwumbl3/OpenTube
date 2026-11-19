import { useEffect, useState } from 'react'
import { getVideo, updateVideoPoll } from '../api'

function defaultOptions() {
  return ['', '']
}

export default function VideoPollEditor({ video, onClose, onSaved, embedded = false }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(defaultOptions())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getVideo(video.id)
      .then((d) => {
        if (cancelled) return
        const poll = d.video?.poll
        if (poll?.question) {
          setQuestion(poll.question)
          setOptions(poll.options?.map((o) => o.text) || defaultOptions())
        } else {
          setQuestion('')
          setOptions(defaultOptions())
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [video.id])

  function setOption(i, value) {
    setOptions((prev) => prev.map((o, j) => (j === i ? value : o)))
  }

  function addOption() {
    setOptions((prev) => (prev.length >= 6 ? prev : [...prev, '']))
  }

  function removeOption(i) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, j) => j !== i)))
  }

  async function onClear() {
    setSaving(true)
    setError('')
    try {
      const data = await updateVideoPoll(video.id, { question: '', options: [] })
      onSaved?.(data.poll)
      if (!embedded) onClose()
      } catch (err) {
      setError(err.message || 'Could not remove poll')
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const q = question.trim()
    const opts = options.map((o) => o.trim()).filter(Boolean)
    if (!q) {
      setError('Enter a poll question')
      return
    }
    if (opts.length < 2) {
      setError('Add at least two answer options')
      return
    }
    setSaving(true)
    try {
      const data = await updateVideoPoll(video.id, { question: q, options: opts })
      onSaved?.(data.poll)
      if (!embedded) onClose()
      } catch (err) {
      setError(err.message || 'Could not save poll')
    } finally {
      setSaving(false)
    }
  }

  const body = loading ? (
          <p className="studio-panel__loading">Loading poll…</p>
        ) : (
          <form className="studio-modal__body" onSubmit={onSubmit}>
            <p className="studio-hint">
              Polls appear under the video description. Viewers can vote while watching; results refresh in real time.
            </p>
            <label className="studio-field">
              <span>Question</span>
              <input
                type="text"
                value={question}
                maxLength={200}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What should we build next?"
              />
            </label>
            <fieldset className="poll-editor-options">
              <legend>Options</legend>
              {options.map((opt, i) => (
                <div key={i} className="poll-editor-option-row">
                  <input
                    type="text"
                    value={opt}
                    maxLength={80}
                    placeholder={`Option ${i + 1}`}
                    onChange={(e) => setOption(i, e.target.value)}
                  />
                  {options.length > 2 ? (
                    <button type="button" className="text-btn" onClick={() => removeOption(i)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {options.length < 6 ? (
                <button type="button" className="creator-studio__btn creator-studio__btn--ghost" onClick={addOption}>
                  Add option
                </button>
              ) : null}
            </fieldset>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="studio-modal__foot">
              <button
                type="button"
                className="creator-studio__btn creator-studio__btn--ghost"
                onClick={onClear}
                disabled={saving}
              >
                Remove poll
              </button>
              {!embedded ? (
                <button type="button" className="creator-studio__btn creator-studio__btn--ghost" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
              ) : null}
              <button type="submit" className="creator-studio__btn creator-studio__btn--primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save poll'}
              </button>
              </div>
            </form>
          )

    if (embedded) return body

    return (
      <div className="studio-modal-backdrop" role="presentation" onClick={onClose}>
        <div
          className="studio-modal studio-modal--wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="poll-editor-title"
          onClick={(ev) => ev.stopPropagation()}
        >
          <header className="studio-modal__head">
            <h2 id="poll-editor-title">Community poll — {video?.title}</h2>
            <button type="button" className="text-btn" onClick={onClose}>
              Close
            </button>
          </header>
          {body}
        </div>
      </div>
    )
  }
