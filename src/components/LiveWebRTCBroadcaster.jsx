import { useEffect, useRef } from 'react'
import {
  pollLiveBroadcasterEvents,
  registerLiveBroadcaster,
  sendLiveBroadcasterSignal,
} from '../api'

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

/**
 * Publishes an existing MediaStream to all WebRTC viewers for this live video.
 * Renders nothing; mount only while the creator is live on the watch page.
 */
export default function LiveWebRTCBroadcaster({ videoId, stream }) {
  const pcsRef = useRef(new Map())
  const handledPeersRef = useRef(new Set())
  const streamRef = useRef(stream)
  streamRef.current = stream

  useEffect(() => {
    if (!videoId || !stream) return undefined

    let cancelled = false
    let pollTimer = 0

    async function ensurePeerConnection(peerId) {
      if (pcsRef.current.has(peerId) || !streamRef.current) return
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      for (const track of streamRef.current.getTracks()) {
        pc.addTrack(track, streamRef.current)
      }
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return
        sendLiveBroadcasterSignal(videoId, peerId, {
          type: 'ice',
          candidate: ev.candidate.toJSON(),
        }).catch(() => {})
      }
      pcsRef.current.set(peerId, pc)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await sendLiveBroadcasterSignal(videoId, peerId, {
        type: 'offer',
        sdp: pc.localDescription,
      })
    }

    async function applyViewerSignal(peerId, msg) {
      const pc = pcsRef.current.get(peerId)
      if (!pc) return
      if (msg.type === 'answer' && msg.sdp) {
        await pc.setRemoteDescription(msg.sdp)
      } else if (msg.type === 'ice' && msg.candidate) {
        try {
          await pc.addIceCandidate(msg.candidate)
        } catch {
          /* ignore */
        }
      }
    }

    async function heartbeat() {
      while (!cancelled) {
        try {
          await registerLiveBroadcaster(videoId)
        } catch {
          /* owner session required */
        }
        await new Promise((r) => setTimeout(r, 3000))
      }
    }

    async function poll() {
      if (cancelled) return
      try {
        const { joins = [], signals = [] } = await pollLiveBroadcasterEvents(videoId)
        for (const j of joins) {
          if (!handledPeersRef.current.has(j.peerId)) {
            handledPeersRef.current.add(j.peerId)
            await ensurePeerConnection(j.peerId)
          }
        }
        for (const batch of signals) {
          for (const msg of batch.messages || []) {
            await applyViewerSignal(batch.peerId, msg)
          }
        }
      } catch {
        /* retry */
      }
      pollTimer = window.setTimeout(poll, 350)
    }

    registerLiveBroadcaster(videoId).catch(() => {})
    poll()
    heartbeat()

    return () => {
      cancelled = true
      clearTimeout(pollTimer)
      for (const pc of pcsRef.current.values()) pc.close()
      pcsRef.current.clear()
      handledPeersRef.current.clear()
    }
  }, [videoId, stream])

  return null
}
