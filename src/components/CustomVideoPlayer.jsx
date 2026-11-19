import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconDefaultView,
  IconFullscreen,
  IconFullscreenExit,
  IconPause,
  IconPlay,
  IconSettings,
  IconTheater,
  IconVolume,
  IconVolumeMute,
} from './Icons'

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function CustomVideoPlayer({
  src,
  poster,
  qualities = [],
  quality,
  onQualityChange,
  theater,
  onTheaterChange,
  onTimeUpdate,
  seekTo,
  seekTrigger = 0,
  isLive = false,
  className = '',
}) {
    const onTimeUpdateRef = useRef(onTimeUpdate)
    onTimeUpdateRef.current = onTimeUpdate
    const containerRef = useRef(null)
  const videoRef = useRef(null)
  const hideTimerRef = useRef(null)
  const settingsRef = useRef(null)
  const pendingTimeRef = useRef(null)
  const resumePlayRef = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPanel, setSettingsPanel] = useState('main')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [seeking, setSeeking] = useState(false)

  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !settingsOpen) {
        setControlsVisible(false)
      }
    }, 2500)
  }, [settingsOpen])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay = () => setPlaying(true)
    const onPause = () => {
      setPlaying(false)
      setControlsVisible(true)
    }
    const onTimeUpdate = () => {
      if (!seeking) setCurrentTime(v.currentTime)
      onTimeUpdateRef.current?.(v.currentTime)
    }
    const onDurationChange = () => setDuration(v.duration || 0)
    const onVolumeChange = () => {
      setVolume(v.volume)
      setMuted(v.muted)
    }
    const onProgress = () => {
      const d = v.duration || 0
      if (v.buffered.length > 0 && d > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1))
      }
    }
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('durationchange', onDurationChange)
    v.addEventListener('volumechange', onVolumeChange)
    v.addEventListener('progress', onProgress)
    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('durationchange', onDurationChange)
      v.removeEventListener('volumechange', onVolumeChange)
      v.removeEventListener('progress', onProgress)
    }
  }, [seeking, duration, src])

    useEffect(() => {
      if (seekTo == null || !Number.isFinite(seekTo)) return
      const v = videoRef.current
      if (!v) return
      v.currentTime = seekTo
      setCurrentTime(seekTo)
    }, [seekTo, seekTrigger])

    useEffect(() => {
      const v = videoRef.current
      if (!v) return
      const t = pendingTimeRef.current
    if (t != null) {
      const wasPlaying = resumePlayRef.current
      const apply = () => {
        v.currentTime = t
        setCurrentTime(t)
        pendingTimeRef.current = null
        resumePlayRef.current = false
        if (wasPlaying) v.play().catch(() => {})
      }
      if (v.readyState >= 1) apply()
      else v.addEventListener('loadedmetadata', apply, { once: true })
    }
  }, [src])

  useEffect(() => {
    if (!settingsOpen) return
    function onPointerDown(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false)
        setSettingsPanel('main')
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        if (settingsPanel !== 'main') setSettingsPanel('main')
        else setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [settingsOpen, settingsPanel])

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play()
    else v.pause()
  }

  function onSeekInput(e) {
    const val = parseFloat(e.target.value)
    setCurrentTime(val)
  }

  function onSeekCommit(e) {
    const val = parseFloat(e.target.value)
    const v = videoRef.current
    if (v) v.currentTime = val
    setCurrentTime(val)
    setSeeking(false)
    showControls()
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
  }

  function onVolumeInput(e) {
    const val = parseFloat(e.target.value)
    const v = videoRef.current
    if (!v) return
    v.volume = val
    v.muted = val === 0
  }

  async function toggleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.()
    } else {
      await document.exitFullscreen?.()
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferPct = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0

  return (
    <div
      ref={containerRef}
      className={`cv-player${controlsVisible || !playing ? ' cv-player--controls-visible' : ''}${
            settingsOpen ? ' cv-player--menu-open' : ''
          }${isLive ? ' cv-player--live' : ''}${className ? ` ${className}` : ''}`}
      onMouseMove={showControls}
      onMouseLeave={() => {
        if (playing && !settingsOpen) setControlsVisible(false)
      }}
    >
      <button
        type="button"
        className="cv-player__tap"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={togglePlay}
      />

      <video
        ref={videoRef}
        key={src}
        className="cv-player__video"
        playsInline
        loop={isLive}
        poster={poster || undefined}
        src={src}
      />

      {isLive ? (
        <div className="cv-player__live-badge" aria-label="Live">
          LIVE
        </div>
      ) : null}

      <div className="cv-player__center-hit" aria-hidden>
        {!playing && (
          <button type="button" className="cv-player__big-play" aria-label="Play">
            <IconPlay />
          </button>
        )}
      </div>

      <div className="cv-player__gradient" aria-hidden />

      <div className="cv-player__controls">
        {!isLive ? (
          <div className="cv-player__seek-wrap">
            <div className="cv-player__seek-buffer" style={{ width: `${bufferPct}%` }} />
            <div className="cv-player__seek-played" style={{ width: `${progress}%` }} />
            <input
              type="range"
              className="cv-player__seek"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={onSeekInput}
              onMouseDown={() => setSeeking(true)}
              onMouseUp={onSeekCommit}
              onTouchStart={() => setSeeking(true)}
              onTouchEnd={onSeekCommit}
              aria-label="Seek"
            />
          </div>
        ) : null}

        <div className="cv-player__bar">
          <div className="cv-player__left">
            <button type="button" className="cv-player__btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <IconPause /> : <IconPlay />}
            </button>

            <VolumeControl
              volume={volume}
              muted={muted}
              onVolumeInput={onVolumeInput}
              toggleMute={toggleMute}
            />

            <span className="cv-player__time">
              {isLive ? (
                <span className="cv-player__time-live">Live</span>
              ) : (
                <>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </>
              )}
            </span>
          </div>

          <div className="cv-player__right">
            <div className="cv-player__settings" ref={settingsRef}>
              <button
                type="button"
                className={`cv-player__btn${settingsOpen ? ' is-active' : ''}`}
                aria-expanded={settingsOpen}
                aria-haspopup="menu"
                aria-label="Settings"
                onClick={() => {
                  setSettingsOpen((o) => !o)
                  setSettingsPanel('main')
                  showControls()
                }}
              >
                <IconSettings />
              </button>

              {settingsOpen ? (
                <div className="cv-player__menu" role="menu">
                  {settingsPanel === 'main' ? (
                    <ul className="cv-player__menu-list">
                      {qualities.length > 0 ? (
                        <li>
                          <button
                            type="button"
                            className="cv-player__menu-row"
                            onClick={() => setSettingsPanel('quality')}
                          >
                            <span>Quality</span>
                            <span className="cv-player__menu-value">{quality}p</span>
                          </button>
                        </li>
                      ) : null}
                      <li>
                        <button
                          type="button"
                          className="cv-player__menu-row"
                          onClick={() => setSettingsPanel('appearance')}
                        >
                          <span>Appearance</span>
                        </button>
                      </li>
                    </ul>
                  ) : settingsPanel === 'quality' ? (
                    <div className="cv-player__submenu">
                      <button
                        type="button"
                        className="cv-player__menu-back"
                        onClick={() => setSettingsPanel('main')}
                      >
                        Quality
                      </button>
                      <ul className="cv-player__menu-list">
                        {qualities.map((s) => (
                          <li key={s.label}>
                            <button
                              type="button"
                              role="menuitemradio"
                              aria-checked={quality === s.label}
                              className={`cv-player__menu-item${quality === s.label ? ' is-active' : ''}`}
                              onClick={() => {
                                const v = videoRef.current
                                pendingTimeRef.current = v?.currentTime ?? 0
                                resumePlayRef.current = !!(v && !v.paused)
                                onQualityChange?.(s.label)
                                setSettingsPanel('main')
                              }}
                            >
                              <span>{s.label}p</span>
                              {quality === s.label ? <span className="cv-player__check">✓</span> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="cv-player__submenu">
                      <button
                        type="button"
                        className="cv-player__menu-back"
                        onClick={() => setSettingsPanel('main')}
                      >
                        Appearance
                      </button>
                      <ul className="cv-player__menu-list">
                        <li>
                          <button
                            type="button"
                            className="cv-player__menu-item"
                            onClick={() => {
                              onTheaterChange?.(true)
                              setSettingsPanel('main')
                            }}
                          >
                            <IconTheater />
                            <span>Theater mode</span>
                            {theater ? <span className="cv-player__check">✓</span> : null}
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            className="cv-player__menu-item"
                            onClick={() => {
                              onTheaterChange?.(false)
                              setSettingsPanel('main')
                            }}
                          >
                            <IconDefaultView />
                            <span>Default view</span>
                            {!theater ? <span className="cv-player__check">✓</span> : null}
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {!theater ? (
              <button
                type="button"
                className="cv-player__btn"
                onClick={() => {
                  onTheaterChange?.(true)
                  showControls()
                }}
                aria-label="Theater mode"
              >
                <IconTheater />
              </button>
            ) : (
              <button
                type="button"
                className="cv-player__btn"
                onClick={() => {
                  onTheaterChange?.(false)
                  showControls()
                }}
                aria-label="Default view"
              >
                <IconDefaultView />
              </button>
            )}

            <button
              type="button"
              className="cv-player__btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function VolumeControl({ volume, muted, onVolumeInput, toggleMute }) {
  const [hover, setHover] = useState(false)
  const displayVol = muted ? 0 : volume

  return (
    <div
      className={`cv-player__volume${hover ? ' cv-player__volume--open' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button type="button" className="cv-player__btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted || volume === 0 ? <IconVolumeMute /> : <IconVolume />}
      </button>
      <div className="cv-player__volume-slider-wrap">
        <input
          type="range"
          className="cv-player__volume-slider"
          min={0}
          max={1}
          step={0.05}
          value={displayVol}
          onChange={onVolumeInput}
          aria-label="Volume"
        />
      </div>
    </div>
  )
}
