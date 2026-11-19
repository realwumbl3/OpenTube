import { useEffect, useRef, useState } from 'react'

const METER_SEGMENTS = 16

function rmsLevel(analyser, timeData) {
  analyser.getByteTimeDomainData(timeData)
  let sum = 0
  for (let i = 0; i < timeData.length; i += 1) {
    const v = (timeData[i] - 128) / 128
    sum += v * v
  }
  const rms = Math.sqrt(sum / timeData.length)
  return Math.min(100, Math.round(rms * 220))
}

export default function LiveCameraPreview({
  active = true,
  badge = 'Live preview',
  showMeter = true,
  className = '',
  onStreamReady,
}) {
  const videoRef = useRef(null)
  const [level, setLevel] = useState(0)
  const [mediaError, setMediaError] = useState('')

  useEffect(() => {
    if (!active) return undefined
    let stream = null
    let raf = 0
    let audioCtx = null
    let cancelled = false

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) return
        onStreamReady?.(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        if (!showMeter) return
        audioCtx = new AudioContext()
        const src = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.65
        src.connect(analyser)
        const timeData = new Uint8Array(analyser.fftSize)
        const tick = () => {
          setLevel(rmsLevel(analyser, timeData))
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch (err) {
        setMediaError(err.message || 'Camera or microphone unavailable')
      }
    }
    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (audioCtx) audioCtx.close().catch(() => {})
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [active, showMeter, onStreamReady])

  const litSegments = Math.round((level / 100) * METER_SEGMENTS)

  return (
    <div className={`live-preview${className ? ` ${className}` : ''}`}>
      <div className="live-preview__row">
        {showMeter && !mediaError ? (
          <div
            className="live-preview__meter live-preview__meter--vertical"
            aria-label={`Microphone level ${level} percent`}
          >
            <span className="live-preview__meter-icon" aria-hidden>
              MIC
            </span>
            <div className="live-preview__meter-bars live-preview__meter-bars--vertical">
              {Array.from({ length: METER_SEGMENTS }, (_, i) => (
                <span
                  key={i}
                  className={`live-preview__meter-seg${i < litSegments ? ' live-preview__meter-seg--on' : ''}${
                    i < 3 && i < litSegments ? ' live-preview__meter-seg--hot' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div className="go-live-rehearsal__stage">
          {mediaError ? (
            <p className="go-live-rehearsal__hint">{mediaError}</p>
          ) : (
            <video ref={videoRef} autoPlay muted playsInline className="go-live-rehearsal__video" />
          )}
          <div className="go-live-rehearsal__badge">{badge}</div>
        </div>
      </div>
    </div>
  )
}
