import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import VideoCard from '../components/VideoCard'
import CustomVideoPlayer from '../components/CustomVideoPlayer'
import LiveCameraPreview from '../components/LiveCameraPreview'
import LiveWebRTCViewer from '../components/LiveWebRTCViewer'
import LiveWebRTCBroadcaster from '../components/LiveWebRTCBroadcaster'
import WatchLaterButton from '../components/WatchLaterButton'
import { IconDownload, IconShare, IconThumbDown, IconThumbUp } from '../components/Icons'
import {
  getComments,
  getVideo,
  listVideos,
  postComment,
  voteComment,
  saveWatchProgress,
  setChannelSubscription,
  getVideoPoll,
  voteVideoPoll,
  videoDownloadHref,
  stopLiveStream,
  } from '../api'
import { useAuth } from '../context/AuthContext'
import { formatRelativeTime, formatTimestamp, formatViews } from '../utils/format'

function countComments(threads) {
  return threads.reduce((n, c) => n + 1 + countComments(c.replies || []), 0)
}

export default function Watch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [video, setVideo] = useState(null)
  const [related, setRelated] = useState([])
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [quality, setQuality] = useState('720')
  const [subscribed, setSubscribed] = useState(false)
  const [theater, setTheater] = useState(true)
  const [descOpen, setDescOpen] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [seekTo, setSeekTo] = useState(null)
  const [seekTrigger, setSeekTrigger] = useState(0)
  const [pollBusy, setPollBusy] = useState(false)
  const [endLiveBusy, setEndLiveBusy] = useState(false)
  const [broadcastStream, setBroadcastStream] = useState(null)
  const lastProgressSave = useRef(0)

  useEffect(() => {
    setReplyTo(null)
    setBroadcastStream(null)
    getVideo(id).then((d) => {
      setVideo(d.video)
      setSubscribed(!!d.video?.subscribed)
    }).catch(() => setVideo(null))
    getComments(id).then((d) => setComments(d.comments)).catch(() => setComments([]))
    listVideos()
      .then((d) => setRelated(d.videos.filter((v) => v.id !== id).slice(0, 12)))
      .catch(() => setRelated([]))
    lastProgressSave.current = 0
  }, [id])

  const refreshComments = useCallback(() => {
    getComments(id).then((d) => setComments(d.comments)).catch(() => {})
  }, [id])

  const handlePlaybackTime = useCallback(
    (positionSec) => {
      if (!user) return
      const now = Date.now()
      if (now - lastProgressSave.current < 15000) return
      lastProgressSave.current = now
      saveWatchProgress(id, positionSec).catch(() => {})
    },
    [id, user]
  )

  useEffect(() => {
    if (!video?.status) return
    if (video.status === 'ready' && !video.isLive) return
    const ms = video.isLive ? 5000 : 4000
    const t = setInterval(() => {
      getVideo(id)
        .then((d) => setVideo(d.video))
        .catch(() => setVideo(null))
    }, ms)
    return () => clearInterval(t)
  }, [id, video?.status, video?.isLive])

  useEffect(() => {
    if (!video?.poll?.question) return undefined
    const t = setInterval(() => {
      getVideoPoll(id)
        .then((d) => {
          if (d.poll) setVideo((v) => (v ? { ...v, poll: d.poll } : v))
        })
        .catch(() => {})
    }, 8000)
    return () => clearInterval(t)
  }, [id, video?.poll?.question])

  function jumpToChapter(startSec) {
    setSeekTo(startSec)
    setSeekTrigger((n) => n + 1)
  }

  async function handlePollVote(optionId) {
    if (!user) {
      setError('Sign in to vote in the poll')
      return
    }
    setPollBusy(true)
    try {
      const data = await voteVideoPoll(id, optionId)
      if (data.poll) setVideo((v) => (v ? { ...v, poll: data.poll } : v))
    } catch (err) {
      setError(err.message || 'Could not submit vote')
    } finally {
      setPollBusy(false)
    }
  }

  const src = useMemo(() => {
    if (!video?.sources?.length) return null
    const pick =
      video.sources.find((s) => s.label === quality) ||
      video.sources.find((s) => s.label === '720') ||
      video.sources[0]
    return pick?.src
  }, [video, quality])

  async function submitComment(e) {
    e.preventDefault()
    if (!user) {
      setError('Sign in to comment')
      return
    }
    const body = text.trim()
    if (!body) return
    try {
      await postComment(id, body, replyTo)
      setText('')
      setReplyTo(null)
      setError('')
      refreshComments()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCommentVote(commentId, direction) {
    if (!user) return
    try {
      await voteComment(commentId, direction)
      refreshComments()
    } catch {
      /* ignore */
    }
  }

  const isOwnChannel = Boolean(
    video && user && (video.isOwner || String(user.id) === String(video.userId))
  )

  async function toggleSubscribe() {
    if (!user || !video?.userId || isOwnChannel) return
    const next = !subscribed
    setSubscribed(next)
    try {
      const data = await setChannelSubscription(video.userId, next)
      setSubscribed(!!data.subscribed)
    } catch {
      setSubscribed(!next)
    }
  }

  async function handleEndLive() {
    if (!isOwnChannel || !video?.isLive) return
    setEndLiveBusy(true)
    setError('')
    try {
      await stopLiveStream()
      navigate('/go-live')
    } catch (err) {
      setError(err.message || 'Could not end stream')
    } finally {
      setEndLiveBusy(false)
    }
  }

  const isWebRTCLive = Boolean(
    video?.isLive && (video?.playback === 'webrtc' || video?.sources?.some((s) => s.src === 'webrtc'))
  )
  const canPlay = isWebRTCLive
    ? Boolean(video?.isLive)
    : Boolean(src && (video?.status === 'ready' || video?.isLive || video?.status === 'live'))
  const creatorLiveDashboard = Boolean(isOwnChannel && video?.isLive)

  if (!video) {
    return (
      <Layout wide watchMode>
        <p className="empty-state">Video not found or still processing.</p>
        <Link className="text-link" to="/">
          Back home
        </Link>
      </Layout>
    )
  }

  const qualities = video.sources?.filter((s) => s.label !== 'original') || []

  const playerShell = (
    <div className={`player-shell${creatorLiveDashboard ? ' player-shell--live-dashboard' : ''}`}>
      {creatorLiveDashboard ? (
        <div className="watch-live-dashboard">
          <LiveWebRTCBroadcaster videoId={id} stream={broadcastStream} />
          <div className="watch-live-dashboard__broadcast">
            <LiveCameraPreview
              badge="Broadcast — what you send"
              className="live-preview--broadcast"
              onStreamReady={setBroadcastStream}
            />
          </div>
          <div className="watch-live-dashboard__lower">
            <section className="watch-live-dashboard__preview" aria-labelledby="live-viewer-preview-title">
              <h2 id="live-viewer-preview-title" className="watch-live-dashboard__heading">
                What viewers see
              </h2>
              {isWebRTCLive ? (
                <LiveWebRTCViewer
                  videoId={id}
                  className="player watch-live-dashboard__program"
                  muted
                />
              ) : canPlay ? (
                <CustomVideoPlayer
                  className="player watch-live-dashboard__program"
                  src={src}
                  poster={video.thumb || undefined}
                  qualities={qualities}
                  quality={quality}
                  onQualityChange={setQuality}
                  isLive
                />
              ) : (
                <div className="watch-live-dashboard__preview-placeholder">
                  <div className="processing-pulse" aria-hidden />
                  <p>Starting broadcast feed for viewers…</p>
                </div>
              )}
            </section>
            <aside className="watch-live-dashboard__panel">
              <div className="go-live-on-air go-live-on-air--compact watch-live-dashboard__status">
                <span className="go-live-on-air__dot" aria-hidden />
                <div>
                  <p className="watch-live-dashboard__status-title">You are live</p>
                  <p className="watch-live-dashboard__status-desc">
                    Viewers on this page see the stream below your camera.
                  </p>
                </div>
              </div>
              <dl className="watch-live-dashboard__meta">
                <div>
                  <dt>Views</dt>
                  <dd>{formatViews(video.views)}</dd>
                </div>
              </dl>
              {error ? <p className="form-error watch-live-dashboard__error">{error}</p> : null}
              <button
                type="button"
                className="creator-studio__btn creator-studio__btn--danger watch-live-dashboard__end"
                disabled={endLiveBusy}
                onClick={handleEndLive}
              >
                {endLiveBusy ? 'Ending…' : 'End stream'}
              </button>
            </aside>
          </div>
        </div>
      ) : isWebRTCLive ? (
        <LiveWebRTCViewer videoId={id} className="player" />
      ) : canPlay ? (
        <CustomVideoPlayer
          className="player"
          src={src}
          poster={video.thumb || undefined}
          qualities={qualities}
          quality={quality}
          onQualityChange={setQuality}
          theater={theater}
          onTheaterChange={setTheater}
          onTimeUpdate={handlePlaybackTime}
          seekTo={seekTo}
          seekTrigger={seekTrigger}
          isLive={video.isLive}
        />
      ) : video.isLive ? (
        <div className="player player--placeholder">
          <div className="processing-pulse" aria-hidden />
          <p>Connecting to live stream…</p>
        </div>
      ) : (
        <div className="player player--placeholder">
          <div className="processing-pulse" aria-hidden />
          <p>Processing… encoding playback qualities.</p>
        </div>
      )}
    </div>
  )

  return (
    <Layout wide watchMode>
      <div className={`watch-page${theater ? ' watch-page--theater' : ''}`}>
        <div className={theater ? 'watch-theater-stage watch-player-area' : 'watch-player-area'}>
          <div className={theater ? 'watch-theater-inner' : 'watch-player-area__inner'}>
            {playerShell}
          </div>
        </div>

        <div className="watch-body">
          <div className="watch-primary">
            <header className="watch-heading">
              <h1 className="watch-title">
                {video.isLive ? (
                  <span className="watch-title__live-pill" aria-hidden>
                    LIVE
                  </span>
                ) : null}
                {video.title}
              </h1>
              <div className="watch-actions-bar">
                <ChannelRow
                  channel={video.channel}
                  userId={video.userId}
                  subscribed={subscribed}
                  showSubscribe={!!user && !isOwnChannel}
                  onSubscribe={toggleSubscribe}
                />
                <div className="watch-actions-bar__end">
                  {isOwnChannel ? (
                    <button
                      type="button"
                      className="creator-studio__btn creator-studio__btn--ghost watch-owner-tools__btn"
                      onClick={() => navigate(`/upload?edit=${video.id}`)}
                      title="Edit title, chapters, and community poll in Creator studio"
                    >
                      Edit video
                    </button>
                  ) : null}
                  <div className="engagement">
                    <div className="engage-group">
                      <button type="button" className="engage-btn">
                        <IconThumbUp />
                        <span>Like</span>
                      </button>
                      <span className="engage-divider" aria-hidden />
                      <button type="button" className="engage-btn engage-btn--icon" aria-label="Dislike">
                        <IconThumbDown />
                      </button>
                    </div>
                    <button type="button" className="engage-btn">
                      <IconShare />
                      <span>Share</span>
                    </button>
                    {user && !video.isLive ? (
                      <WatchLaterButton
                        variant="bar"
                        videoId={video.id}
                        saved={!!video.inWatchLater}
                      />
                    ) : null}
                    {user && video.status === 'ready' ? (
                      <a
                        className="engage-btn"
                        href={videoDownloadHref(id)}
                        download
                        title="Download original uploaded file"
                      >
                        <IconDownload />
                        <span>Download</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
              {isOwnChannel && video.isLive ? (
                <p className="watch-owner-tools__hint">
                  This watch page is your live dashboard — camera preview and controls are above the player.
                </p>
              ) : isOwnChannel ? (
                <p className="watch-owner-tools__hint">
                  Chapters and community polls are in Creator studio when you edit this video.
                </p>
              ) : null}
            </header>

            <div className={`desc-box${descOpen ? ' desc-box--open' : ''}`}>
              <button
                type="button"
                className="desc-box__toggle"
                onClick={() => setDescOpen((o) => !o)}
              >
                <span className="desc-stats">
                  {formatViews(video.views)} views · {formatRelativeTime(video.createdAt)}
                </span>
                {video.description ? (
                  <p className={`watch-desc${descOpen ? '' : ' watch-desc--clamp'}`}>{video.description}</p>
                ) : null}
              </button>
              </div>

              {video.chapters?.length > 0 ? (
              <nav className="watch-chapters" aria-label="Video chapters">
                <h2 className="watch-chapters__title">Chapters</h2>
                <ol className="watch-chapters__list">
                  {video.chapters.map((ch, idx) => (
                    <li key={`${ch.startSec}-${idx}`}>
                      <button
                        type="button"
                        className="watch-chapters__item"
                        onClick={() => jumpToChapter(ch.startSec)}
                      >
                        <span className="watch-chapters__time">{formatTimestamp(ch.startSec)}</span>
                        <span className="watch-chapters__label">{ch.title}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
              ) : null}

              {video.poll?.question ? (
              <section className="watch-poll" aria-labelledby="watch-poll-title">
                <h2 id="watch-poll-title" className="watch-poll__title">
                  Community poll
                </h2>
                <p className="watch-poll__question">{video.poll.question}</p>
                <ul className="watch-poll__options">
                  {video.poll.options.map((opt) => {
                    const total = video.poll.totalVotes || 0
                    const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
                    const selected = video.poll.myVote === opt.id
                    return (
                      <li key={opt.id}>
                        <button
                          type="button"
                          className={`watch-poll__option${selected ? ' watch-poll__option--picked' : ''}`}
                          disabled={pollBusy}
                          onClick={() => handlePollVote(opt.id)}
                        >
                          <span className="watch-poll__bar" style={{ width: `${pct}%` }} aria-hidden />
                          <span className="watch-poll__option-text">{opt.text}</span>
                          <span className="watch-poll__option-pct">{pct}%</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <p className="watch-poll__meta">
                  {video.poll.totalVotes || 0} vote{(video.poll.totalVotes || 0) === 1 ? '' : 's'}
                  {!user ? ' · Sign in to vote' : ''}
                </p>
              </section>
            ) : null}

          <section className="comments">
            <div className="comments-head">
              <h2>{countComments(comments)} Comments</h2>
            </div>
            {replyTo ? (
              <p className="comment-reply-hint">
                Replying to a comment{' '}
                <button type="button" className="text-btn" onClick={() => setReplyTo(null)}>
                  Cancel
                </button>
              </p>
            ) : null}
            <form className="comment-form" onSubmit={submitComment}>
              <div className="channel-avatar channel-letter comment-avatar">
                {user ? user.display_name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="comment-input-wrap">
                <input
                  type="text"
                  placeholder={
                    user
                      ? replyTo
                        ? 'Add a reply…'
                        : 'Add a comment…'
                      : 'Sign in to comment'
                  }
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={!user}
                />
                {text.trim() ? (
                  <div className="comment-actions">
                    <button type="button" className="text-btn" onClick={() => setText('')}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={!user}>
                      Comment
                    </button>
                  </div>
                ) : null}
              </div>
            </form>
            {error && <p className="form-error">{error}</p>}
            <ul className="comment-list">
              {comments.map((c) => (
                <CommentThread
                  key={c.id}
                  comment={c}
                  canReply={!!user}
                  canVote={!!user}
                  onReply={(commentId) => {
                    setReplyTo(commentId)
                    setText('')
                  }}
                  onVote={handleCommentVote}
                />
              ))}
            </ul>
          </section>
        </div>

        <aside className="watch-sidebar" aria-label="Up next">
          {related.map((v) => (
            <VideoCard key={v.id} video={v} compact />
          ))}
        </aside>
        </div>
      </div>
      </Layout>
  )
}

function CommentThread({ comment, canReply, canVote, onReply, onVote, depth = 0 }) {
  const score = comment.score ?? 0
  return (
    <li className={`comment-item${depth > 0 ? ' comment-item--reply' : ''}`}>
      <div className="channel-avatar channel-letter comment-avatar">
        {comment.author?.charAt(0)?.toUpperCase() || '?'}
      </div>
      <div className="comment-item__body">
        <p className="comment-author">
          {comment.author}
          <span className="stats"> · {formatRelativeTime(comment.created_at)}</span>
        </p>
        <p className="comment-body">{comment.body}</p>
        <div className="comment-actions-row">
          {canVote ? (
            <div className="comment-votes">
              <button
                type="button"
                className={`comment-vote-btn${comment.viewerVote === 1 ? ' comment-vote-btn--active' : ''}`}
                aria-label="Upvote comment"
                onClick={() => onVote(comment.id, 'up')}
              >
                <IconThumbUp />
              </button>
              <span className="comment-score" aria-label={`Net score ${score}`}>
                {score}
              </span>
              <button
                type="button"
                className={`comment-vote-btn${comment.viewerVote === -1 ? ' comment-vote-btn--active' : ''}`}
                aria-label="Downvote comment"
                onClick={() => onVote(comment.id, 'down')}
              >
                <IconThumbDown />
              </button>
            </div>
          ) : (
            <span className="comment-score comment-score--readonly">{score}</span>
          )}
          {canReply ? (
            <button type="button" className="text-btn comment-reply-btn" onClick={() => onReply(comment.id)}>
              Reply
            </button>
          ) : null}
        </div>
        {comment.replies?.length ? (
          <ul className="comment-replies">
            {comment.replies.map((r) => (
              <CommentThread
                key={r.id}
                comment={r}
                canReply={canReply}
                canVote={canVote}
                onReply={onReply}
                onVote={onVote}
                depth={depth + 1}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  )
}

function ChannelRow({ channel, userId, subscribed, showSubscribe, onSubscribe }) {
  const channelTo = userId ? `/channel/${userId}` : null
  return (
    <div className="channel-row">
      {channelTo ? (
        <Link to={channelTo} className="channel-row__identity">
          <div className="channel-avatar channel-letter channel-row__avatar">{channel?.charAt(0) || '?'}</div>
          <div className="channel-row__meta">
            <p className="channel-row__name">{channel}</p>
          </div>
        </Link>
      ) : (
        <>
          <div className="channel-avatar channel-letter channel-row__avatar">{channel?.charAt(0) || '?'}</div>
          <div className="channel-row__meta">
            <p className="channel-row__name">{channel}</p>
          </div>
        </>
      )}
      {showSubscribe ? (
        <button
          type="button"
          className={`subscribe-btn${subscribed ? ' subscribed' : ''}`}
          onClick={onSubscribe}
        >
          {subscribed ? 'Subscribed' : 'Subscribe'}
        </button>
      ) : null}
    </div>
  )
}
