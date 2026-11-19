import { useEffect, useRef, useState } from 'react'
import { joinLiveWebRTC, pollLiveViewerSignals, sendLiveViewerSignal } from '../api'

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export default function LiveWebRTCViewer({ videoId, className = '', muted = false }) {
  const videoRef = useRef(null)
  const pcRef = useRef(null)
  const peerIdRef = useRef(null)
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let pollTimer = 0

    async function handleOffer(offer) {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc
      pc.ontrack = (ev) => {
        if (videoRef.current) {
          videoRef.current.srcObject = ev.streams[0] || new MediaStream([ev.track])
          videoRef.current.play().catch(() => {})
        }
        setStatus('live')
      }
      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !peerIdRef.current) return
        sendLiveViewerSignal(videoId, peerIdRef.current, {
          type: 'ice',
          candidate: ev.candidate.toJSON(),
        }).catch(() => {})
      }
      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await sendLiveViewerSignal(videoId, peerIdRef.current, {
        type: 'answer',
        sdp: pc.localDescription,
      })
    }

    async function start() {
      try {
        const { peerId } = await joinLiveWebRTC(videoId)
        if (cancelled) return
        peerIdRef.current = peerId

        const tick = async () => {
          if (cancelled || !peerIdRef.current) return
          try {
            const { messages } = await pollLiveViewerSignals(videoId, peerIdRef.current)
            for (const msg of messages || []) {
              if (msg.type === 'offer' && msg.sdp && !pcRef.current) {
                await handleOffer(msg.sdp)
              } else if (msg.type === 'ice' && msg.candidate && pcRef.current) {
                try {
                  await pcRef.current.addIceCandidate(msg.candidate)
                } catch {
                  /* ignore */
                }
              }
            }
          } catch {
            /* retry */
          }
          pollTimer = window.setTimeout(tick, 400)
        }
        tick()
      } catch (err) {
        setError(err.message || 'Could not join live stream')
        setStatus('error')
      }
    }

    start()

    return () => {
      cancelled = true
      clearTimeout(pollTimer)
      pcRef.current?.close()
      pcRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [videoId])

  if (status === 'error') {
    return (
      <div className={`live-webrtc-viewer live-webrtc-viewer--error ${className}`.trim()}>
        <p>{error || 'Live stream unavailable'}</p>
      </div>
    )
  }

  return (
    <div className={`live-webrtc-viewer ${className}`.trim()}>
      <video
        ref={videoRef}
        className="live-webrtc-viewer__video"
        playsInline
        autoPlay
        muted={muted}
      />
      {status === 'connecting' ? (
        <div className="live-webrtc-viewer__overlay">
          <div className="processing-pulse" aria-hidden />
          <p>Connecting to live stream…</p>
        </div>
      ) : null}
      {status === 'live' ? (
        <span className="live-webrtc-viewer__badge" aria-hidden>
          LIVE
        </span>
      ) : null}
    </div>
  )
}
