import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    listSwitchableUsers,
    listSubscribedChannels,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getMyLiveStream,
  } from '../api'
import { useAuth } from '../context/AuthContext'
import { formatRelativeTime } from '../utils/format'
import {
    IconBell,
    IconCreate,
    IconHistory,
    IconWatchLater,
    IconHome,
    IconMenu,
    IconMic,
    IconSearch,
    IconSubscriptions,
    IconGoLive,
    IconUpload,
    LogoYoutube,
  } from './Icons'

function NavLink({ to, icon, label, collapsed, end }) {
  const location = useLocation()
  const active = end ? location.pathname === to : location.pathname.startsWith(to)
  return (
    <Link
      to={to}
      className={`nav-item${active ? ' active' : ''}`}
      title={collapsed ? label : undefined}
    >
      <span className="nav-item__icon">{icon}</span>
      <span className="nav-item__label">{label}</span>
    </Link>
  )
}

function SubscriptionsNav({ collapsed, subsOpen, onToggleSubs, channels }) {
  const location = useLocation()
  const active = location.pathname.startsWith('/subscriptions')
  const preview = channels.slice(0, 8)

  return (
    <div className={`nav-subs${subsOpen ? ' nav-subs--open' : ''}`}>
      <div className={`nav-subs__row${active ? ' nav-subs__row--active' : ''}`}>
        <Link
          to="/subscriptions"
          className="nav-item nav-item--subs"
          title={collapsed ? 'Subscriptions' : undefined}
        >
          <span className="nav-item__icon">
            <IconSubscriptions />
          </span>
          <span className="nav-item__label">Subscriptions</span>
        </Link>
        {!collapsed && channels.length > 0 ? (
          <button
            type="button"
            className="nav-subs__toggle"
            aria-expanded={subsOpen}
            aria-label={subsOpen ? 'Hide subscribed channels' : 'Show subscribed channels'}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleSubs()
            }}
          />
        ) : null}
      </div>
      {!collapsed && subsOpen && preview.length > 0 ? (
        <ul className="nav-subs__list">
          {preview.map((ch) => (
            <li key={ch.id}>
              <Link to={`/channel/${ch.id}`} className="nav-subs__channel">
                <span className="channel-avatar channel-letter nav-subs__avatar" aria-hidden>
                  {ch.displayName?.charAt(0)?.toUpperCase() || '?'}
                </span>
                <span className="nav-subs__name">{ch.displayName}</span>
              </Link>
            </li>
          ))}
          {channels.length > preview.length ? (
            <li>
              <Link to="/subscriptions?tab=channels" className="nav-subs__more">
                Show all ({channels.length})
              </Link>
            </li>
          ) : (
            <li>
              <Link to="/subscriptions?tab=channels" className="nav-subs__more">
                Manage subscriptions
              </Link>
            </li>
          )}
        </ul>
      ) : null}
    </div>
  )
}

export default function Layout({
  children,
  search,
  onSearchChange,
  onSearchSubmit,
  wide = false,
  hideSidebar = false,
  watchMode = false,
}) {
  const { user, logout, switchToUser } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [switchable, setSwitchable] = useState([])
  const [switching, setSwitching] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [subsOpen, setSubsOpen] = useState(false)
  const [subChannels, setSubChannels] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [myLive, setMyLive] = useState(null)
  const notifWrapRef = useRef(null)
  const createWrapRef = useRef(null)
  const location = useLocation()

  function refreshNotifications() {
    if (!user) return
    getNotifications()
      .then((d) => {
        setNotifications(d.notifications || [])
        setUnreadCount(d.unreadCount ?? 0)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    refreshNotifications()
  }, [user])

  useEffect(() => {
    if (!user) {
      setMyLive(null)
      return undefined
    }
    function refresh() {
      getMyLiveStream()
        .then((d) => setMyLive(d.live))
        .catch(() => setMyLive(null))
    }
    refresh()
    const t = setInterval(refresh, 12000)
    return () => clearInterval(t)
  }, [user])

  useEffect(() => {
    if (!user?.quick_switch) {
      setSwitchable([])
      return
    }
    let cancelled = false
    listSwitchableUsers()
      .then((data) => {
        if (!cancelled) setSwitchable(data.users || [])
      })
      .catch(() => {
        if (!cancelled) setSwitchable([])
      })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (watchMode) setCollapsed(true)
  }, [watchMode])

  useEffect(() => {
    if (collapsed) setSubsOpen(false)
  }, [collapsed])

  useEffect(() => {
    if (!user) {
      setSubChannels([])
      return
    }
    let cancelled = false
    listSubscribedChannels()
      .then((data) => {
        if (!cancelled) setSubChannels(data.channels || [])
      })
      .catch(() => {
        if (!cancelled) setSubChannels([])
      })
    return () => {
      cancelled = true
    }
  }, [user, location.pathname])

  useEffect(() => {
    if (!notifOpen) return
    function onPointerDown(e) {
      if (notifWrapRef.current?.contains(e.target)) return
      setNotifOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setNotifOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [notifOpen])

  useEffect(() => {
    if (!createOpen) return
    function onPointerDown(e) {
      if (createWrapRef.current?.contains(e.target)) return
      setCreateOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setCreateOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [createOpen])

  const showGuideSidebar = !hideSidebar && (!watchMode || !collapsed)

  return (
    <div className={`app${collapsed ? ' sidebar-collapsed' : ''}${watchMode ? ' app--watch' : ''}`}>
      <header className="header">
        <div className="header-left">
          <button
            type="button"
            className="icon-btn"
            aria-label="Guide menu"
            onClick={() => setCollapsed((c) => !c)}
          >
            <IconMenu />
          </button>
          <Link to="/" className="logo" aria-label="YouTube Home">
            <LogoYoutube />
          </Link>
        </div>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault()
            onSearchSubmit?.()
          }}
          role="search"
        >
          <div className="search-inner">
            <input
              type="search"
              placeholder="Search"
              value={search ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
            <button
              type="button"
              className="search-mic-btn"
              aria-label="Search with your voice"
            >
              <IconMic />
            </button>
          </div>
          <button type="submit" className="search-btn" aria-label="Search">
            <IconSearch />
          </button>
        </form>
        <div className="header-right">
          {user ? (
            <>
              {myLive?.videoId ? (
                <Link
                  to={`/watch/${myLive.videoId}`}
                  className="header-live-dashboard"
                  title="Return to your live dashboard"
                >
                  <span className="go-live-on-air__dot" aria-hidden />
                  Live dashboard
                </Link>
              ) : null}
              <div className="create-wrap" ref={createWrapRef}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Create"
                  title="Create"
                  aria-expanded={createOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setCreateOpen((o) => {
                      const next = !o
                      if (next) setNotifOpen(false)
                      return next
                    })
                  }}
                >
                  <IconCreate />
                </button>
                {createOpen ? (
                  <div className="create-menu" role="menu">
                    <button
                      type="button"
                      className="create-menu__item"
                      role="menuitem"
                      onClick={() => {
                        setCreateOpen(false)
                        navigate('/upload?upload=1')
                      }}
                    >
                      <span className="create-menu__icon" aria-hidden>
                        <IconUpload />
                      </span>
                      Upload video
                    </button>
                    <button
                      type="button"
                      className="create-menu__item"
                      role="menuitem"
                      onClick={() => {
                        setCreateOpen(false)
                        navigate('/go-live')
                      }}
                    >
                      <span className="create-menu__icon" aria-hidden>
                        <IconGoLive />
                      </span>
                      Go live
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="notif-wrap" ref={notifWrapRef}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                  onClick={() => {
                    setNotifOpen((o) => {
                      const next = !o
                      if (next) {
                        setMenuOpen(false)
                        refreshNotifications()
                      }
                      return next
                    })
                  }}
                >
                  <IconBell />
                  {unreadCount > 0 ? (
                    <span className="notif-badge" aria-hidden>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </button>
                {notifOpen ? (
                  <div className="notif-panel" role="region" aria-label="Notifications">
                    <div className="notif-panel__head">
                      <h2>Notifications</h2>
                      {unreadCount > 0 ? (
                        <button
                          type="button"
                          className="text-btn notif-panel__mark-all"
                          onClick={async () => {
                            await markAllNotificationsRead()
                            refreshNotifications()
                          }}
                        >
                          Mark all read
                        </button>
                      ) : null}
                    </div>
                    <ul className="notif-list">
                      {notifications.length === 0 ? (
                        <li className="notif-empty">No notifications yet.</li>
                      ) : (
                        notifications.map((n) => (
                          <li key={n.id} className={`notif-item${n.read ? '' : ' notif-item--unread'}`}>
                            <button
                              type="button"
                              className="notif-item__btn"
                              onClick={async () => {
                                if (!n.read) {
                                  await markNotificationRead(n.id).catch(() => {})
                                  refreshNotifications()
                                }
                                setNotifOpen(false)
                                if (n.type === 'subscription' && n.fromUserId) {
                                  navigate(`/channel/${n.fromUserId}`)
                                } else if (n.videoId) {
                                  navigate(`/watch/${n.videoId}?c=${n.commentId || ''}`)
                                }
                              }}
                            >
                              <span className="notif-item__avatar" aria-hidden>
                                {n.fromName.charAt(0).toUpperCase()}
                              </span>
                              <span className="notif-item__body">
                                <span className="notif-item__text">
                                  {n.type === 'subscription' ? (
                                    <>
                                      <strong>{n.fromName}</strong> subscribed to your channel
                                    </>
                                  ) : (
                                    <>
                                      <strong>{n.fromName}</strong> replied to your comment
                                    </>
                                  )}
                                </span>
                                <span className="notif-item__meta">
                                  {n.type === 'subscription' ? 'New subscriber' : n.videoTitle}
                                  {n.createdAt ? (
                                    <span className="notif-item__time">
                                      {' · '}
                                      {formatRelativeTime(n.createdAt)}
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                              {n.videoThumb ? (
                                <img className="notif-item__thumb" src={n.videoThumb} alt="" />
                              ) : (
                                <span className="notif-item__thumb notif-item__thumb--placeholder" aria-hidden />
                              )}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="avatar-btn"
                aria-label="Account menu"
                title={user.display_name}
                onClick={() => {
                  setMenuOpen((o) => !o)
                  setNotifOpen(false)
                }}
              >
                {user.display_name.charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <div className="account-menu">
                  <p className="account-menu__name">{user.display_name}</p>
                  {user.quick_switch && switchable.length > 0 ? (
                    <div className="account-menu__switch">
                      <p className="account-menu__section">Switch account</p>
                      {switchable.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className={`account-menu__item account-menu__switch-item${
                            u.id === user.id ? ' account-menu__switch-item--active' : ''
                          }`}
                          disabled={switching || u.id === user.id}
                          onClick={async () => {
                            if (u.id === user.id) return
                            setSwitching(true)
                            try {
                              await switchToUser(u.id)
                              setMenuOpen(false)
                              window.location.reload()
                            } catch {
                              setSwitching(false)
                            }
                          }}
                        >
                          <span className="account-menu__switch-avatar" aria-hidden>
                            {u.display_name.charAt(0).toUpperCase()}
                          </span>
                          <span className="account-menu__switch-label">{u.display_name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="account-menu__item"
                    onClick={() => {
                      setMenuOpen(false)
                      navigate(`/channel/${user.id}`)
                    }}
                  >
                    Your channel
                  </button>
                  <button type="button" className="account-menu__item" onClick={() => navigate('/upload')}>
                    Creator studio
                  </button>
                  <button
                    type="button"
                    className="account-menu__item"
                    onClick={() => {
                      setMenuOpen(false)
                      navigate('/go-live')
                    }}
                  >
                    Go live
                  </button>
                  <button
                    type="button"
                    className="account-menu__item"
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <span className="header-hint">Sign in with your magic link</span>
          )}
        </div>
      </header>

      <div className="layout">
        {watchMode && !collapsed ? (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close guide menu"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setCollapsed(true)
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          />
        ) : null}
        {showGuideSidebar && (
          <aside
            className={`sidebar${watchMode ? ' sidebar--watch-overlay' : ''}`}
            aria-label="Guide"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <nav>
              <NavLink to="/" icon={<IconHome />} label="Home" collapsed={collapsed} end />
              {user && (
                <>
                  <SubscriptionsNav
                    collapsed={collapsed}
                    subsOpen={subsOpen}
                    onToggleSubs={() => setSubsOpen((o) => !o)}
                    channels={subChannels}
                  />
                  <NavLink
                    to="/history"
                    icon={<IconHistory />}
                    label="History"
                    collapsed={collapsed}
                  />
                  <NavLink
                    to="/watch-later"
                    icon={<IconWatchLater filled />}
                    label="Watch later"
                    collapsed={collapsed}
                  />
                  <NavLink
                    to="/upload"
                    icon={<IconUpload />}
                    label="Studio"
                    collapsed={collapsed}
                  />
                  <NavLink
                    to="/go-live"
                    icon={<IconGoLive />}
                    label="Go live"
                    collapsed={collapsed}
                  />
                </>
              )}
            </nav>
          </aside>
        )}
        <main className={`feed${wide ? ' feed--wide' : ''}${watchMode ? ' feed--watch' : ''}`}>{children}</main>
      </div>
    </div>
  )
}
