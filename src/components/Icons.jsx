const base = { width: 24, height: 24, fill: 'currentColor', 'aria-hidden': true }

export function IconMenu(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 7h18v1.5H3V7zm0 5.25h18V13.5H3v-1.25zm0 5.25h18V19H3v-1.5z" />
    </svg>
  )
}

export function IconHome(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 10V21h6v-6h4v6h6V10L12 3 4 10z" />
    </svg>
  )
}

export function IconUpload(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 3.2 7.2 8h3.3v6.5h3V8h3.3L12 3.2zM5 18.5h14v2H5v-2z" />
    </svg>
  )
}

export function IconGoLive(props) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" fill="#ff0000" />
    </svg>
  )
}

export function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M10.5 3a7.5 7.5 0 1 0 4.74 13.35l4.52 4.52a1.25 1.25 0 0 0 1.77-1.77l-4.52-4.52A7.47 7.47 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" />
    </svg>
  )
}

export function IconMic(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 14c1.66 0 3-1.34 3-3V7c0-1.66-1.34-3-3-3S9 5.34 9 7v4c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  )
}

export function IconCreate(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4.5 4V6.5L17 10.5z" />
      <path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function IconBell(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  )
}

export function IconThumbUp(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2.08z" />
    </svg>
  )
}

export function IconThumbDown(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <g transform="rotate(180 12 12)">
        <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2.08z" />
      </g>
    </svg>
  )
}

export function IconWatchLater({ filled = false, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor" aria-hidden {...props}>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 1.75c4.55 0 8.25 3.7 8.25 8.25S16.55 20.25 12 20.25 3.75 16.55 3.75 12 7.45 3.75 12 3.75z"
        opacity={filled ? 0 : 0.35}
      />
      <path d="M12.5 7H11v6l4.25 2.52.75-1.23-3.5-2.07V7z" />
    </svg>
  )
}

export function IconDownload(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M5 20h14v-2H5v2zm7-18l-5.5 5.5h3v6h5v-6h3L12 2z" />
    </svg>
  )
}

export function IconShare(props) {
  const dotR = 2.15
  const lx = 6
  const ly = 12
  const tx = 18
  const ty = 6
  const bx = 18
  const by = 18
  const ux = 0.894427
  const uy = -0.447214
  const topStart = `${lx + dotR * ux} ${ly + dotR * uy}`
  const topEnd = `${tx - dotR * ux} ${ty - dotR * uy}`
  const botStart = `${lx + dotR * ux} ${ly - dotR * uy}`
  const botEnd = `${bx - dotR * ux} ${by + dotR * uy}`
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx={lx} cy={ly} r={dotR} />
      <circle cx={tx} cy={ty} r={dotR} />
      <circle cx={bx} cy={by} r={dotR} />
      <path
        d={`M ${topStart} L ${topEnd} M ${botStart} L ${botEnd}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconSettings(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
    </svg>
  )
}

export function IconTheater(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M21 3H3v5h18V3zm0 8H3v10h18V11z" />
    </svg>
  )
}

export function IconDefaultView(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 4h16v16H4V4zm4 4h8v8H8V8z" fillRule="evenodd" />
    </svg>
  )
}

export function IconPlay(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export function IconPause(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}

export function IconVolume(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  )
}

export function IconVolumeMute(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 9v6h4l5 5V4L7 9H3z" />
      <path d="M16.5 12.5l6-6M22.5 12.5l-6-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconFullscreen(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  )
}

export function IconFullscreenExit(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
    </svg>
  )
}

export function IconSubscriptions(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm2.5 2.5v7l5.5-3.5-5.5-3.5zM15 10h4v1.5h-4V10zm0 3h4v1.5h-4V13z" />
    </svg>
  )
}

export function IconHistory(props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm.75 3.25V12l4 2.5-.75 1.25-4.75-3V7.25h1.5z" />
    </svg>
  )
}

export function LogoYoutube() {
  return (
    <>
      <svg className="logo-mark" viewBox="0 0 28 20" width="34" height="24" aria-hidden>
        <path
          fill="#FF0000"
          d="M27.2 4.6c-.3-1.2-1.3-2.2-2.4-2.5C22.4 1.4 14 1.4 14 1.4s-8.4 0-10.8.7C2.1 2.4 1.1 3.4.8 4.6.5 6 .5 10 .5 10s0 4 .3 5.4c.3 1.2 1.3 2.2 2.4 2.5 2.4.7 10.8.7 10.8.7s8.4 0 10.8-.7c1.2-.3 2.1-1.3 2.4-2.5.3-1.4.3-5.4.3-5.4s0-4-.3-5.4z"
        />
        <path fill="#fff" d="M11.2 13.2V6.8l6.8 3.2-6.8 3.2z" />
      </svg>
      <span className="logo-word">YouTube</span>
    </>
  )
}
