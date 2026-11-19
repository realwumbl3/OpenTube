import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatStatLine } from '../utils/format'
import WatchLaterButton from './WatchLaterButton'

function channelTo(video) {
  return video.userId ? `/channel/${video.userId}` : null
}

function ThumbShell({ video, compact, children }) {
  const { user } = useAuth()
  const watchTo = `/watch/${video.id}`
  const showWatchLater = Boolean(user && !video.isLive)

  return (
    <div className={`thumb-wrap${compact ? ' thumb-wrap--compact' : ''}`}>
      <Link to={watchTo} className="video-card__thumb-link">
        {children}
      </Link>
      {showWatchLater ? (
        <WatchLaterButton
          videoId={video.id}
          saved={!!video.inWatchLater}
          compact={compact}
        />
      ) : null}
    </div>
  )
}

function ThumbBlock({ video }) {
  return (
    <>
      {video.thumb ? (
        <img src={video.thumb} alt="" className="thumb" loading="lazy" />
      ) : (
        <div className="thumb thumb-placeholder" />
      )}
      {video.isLive || video.duration ? (
        <span className={`duration${video.isLive ? ' duration--live' : ''}`}>
          {video.isLive ? 'LIVE' : video.duration}
        </span>
      ) : null}
    </>
  )
}

function ChannelAvatar({ video, className }) {
  const to = channelTo(video)
  const initial = video.channel?.charAt(0) || '?'
  if (to) {
    return (
      <Link to={to} className={`${className} channel-link`} onClick={(e) => e.stopPropagation()}>
        {initial}
      </Link>
    )
  }
  return <div className={className}>{initial}</div>
}

function ChannelName({ video }) {
  const to = channelTo(video)
  if (to) {
    return (
      <Link to={to} className="channel channel-link" onClick={(e) => e.stopPropagation()}>
        {video.channel}
      </Link>
    )
  }
  return <p className="channel">{video.channel}</p>
}

export default function VideoCard({ video, compact = false, list = false }) {
  const statLine = formatStatLine(video)
  const useCompact = compact || list
  const watchTo = `/watch/${video.id}`

  if (useCompact) {
    return (
      <article className="video-card video-card--compact">
        <ThumbShell video={video} compact>
          <ThumbBlock video={video} />
        </ThumbShell>
        <div className="meta meta--compact">
          <ChannelAvatar video={video} className="channel-avatar channel-letter" />
          <div className="meta-text">
            <Link to={watchTo} className="video-card__title-link">
              <h3 className="title">{video.title}</h3>
            </Link>
            <ChannelName video={video} />
            <p className="stats">{statLine}</p>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="video-card">
      <ThumbShell video={video}>
        <ThumbBlock video={video} />
      </ThumbShell>
      <div className="meta">
        <ChannelAvatar video={video} className="channel-avatar channel-letter" />
        <div className="meta-text">
          <Link to={watchTo} className="video-card__title-link">
            <h3 className="title">{video.title}</h3>
          </Link>
          <ChannelName video={video} />
          <p className="stats">{statLine}</p>
        </div>
      </div>
    </article>
  )
}
