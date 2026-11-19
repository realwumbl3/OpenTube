import { Link } from 'react-router-dom'
import { IconGoLive } from './Icons'

export default function CreatorStudioShell({ title, subtitle, actions, children, activeRail = 'content' }) {
  return (
    <div className="creator-studio">
      <header className="creator-studio__top">
        <div className="creator-studio__brand">
          <span className="creator-studio__mark" aria-hidden />
          <div>
            <p className="creator-studio__eyebrow">Creator studio</p>
            <h1 className="creator-studio__title">{title}</h1>
            {subtitle ? <p className="creator-studio__sub">{subtitle}</p> : null}
          </div>
        </div>
        <div className="creator-studio__actions">{actions}</div>
      </header>
      <div className="creator-studio__layout">
        <aside className="creator-studio__rail" aria-label="Studio navigation">
          <Link
            to="/upload"
            className={`creator-studio__rail-link${activeRail === 'content' ? ' creator-studio__rail-link--active' : ''}`}
          >
            Channel content
          </Link>
          <Link
            to="/go-live"
            className={`creator-studio__rail-link creator-studio__rail-link--live${
              activeRail === 'live' ? ' creator-studio__rail-link--active' : ''
            }`}
          >
            <IconGoLive />
            Live streaming
          </Link>
        </aside>
        <main className="creator-studio__content">{children}</main>
      </div>
    </div>
  )
}
