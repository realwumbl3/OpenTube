import { randomBytes } from 'crypto'

/** @type {Map<string, {
 *   broadcasterUserId: string | null,
 *   broadcasterLastSeen: number,
 *   peers: Map<string, { toViewer: object[], toBroadcaster: object[] }>,
 *   joinQueue: { peerId: string, at: number }[],
 * }>} */
const rooms = new Map()

const BROADCASTER_TTL_MS = 15000

function getRoom(videoId) {
  if (!rooms.has(videoId)) {
    rooms.set(videoId, {
      broadcasterUserId: null,
      broadcasterLastSeen: 0,
      peers: new Map(),
      joinQueue: [],
    })
  }
  return rooms.get(videoId)
}

export function clearLiveSignalingRoom(videoId) {
  rooms.delete(videoId)
}

export function touchBroadcaster(videoId, userId) {
  const room = getRoom(videoId)
  room.broadcasterUserId = userId
  room.broadcasterLastSeen = Date.now()
  return { ok: true }
}

export function isBroadcasterOnline(videoId) {
  const room = rooms.get(videoId)
  if (!room?.broadcasterUserId) return false
  return Date.now() - room.broadcasterLastSeen < BROADCASTER_TTL_MS
}

export function viewerJoinLive(videoId) {
  const room = getRoom(videoId)
  const peerId = randomBytes(12).toString('hex')
  room.peers.set(peerId, { toViewer: [], toBroadcaster: [] })
  room.joinQueue.push({ peerId, at: Date.now() })
  return { peerId }
}

export function drainJoinQueue(videoId) {
  const room = rooms.get(videoId)
  if (!room) return []
  const items = room.joinQueue.splice(0)
  return items
}

export function pushToViewer(videoId, peerId, message) {
  const room = rooms.get(videoId)
  const peer = room?.peers.get(peerId)
  if (!peer) return false
  peer.toViewer.push({ ...message, at: Date.now() })
  return true
}

export function pushToBroadcaster(videoId, peerId, message) {
  const room = rooms.get(videoId)
  const peer = room?.peers.get(peerId)
  if (!peer) return false
  peer.toBroadcaster.push({ ...message, at: Date.now() })
  return true
}

export function drainViewerSignals(videoId, peerId) {
  const peer = rooms.get(videoId)?.peers.get(peerId)
  if (!peer) return []
  const batch = peer.toViewer.splice(0)
  return batch
}

export function drainBroadcasterSignals(videoId, peerId) {
  const peer = rooms.get(videoId)?.peers.get(peerId)
  if (!peer) return []
  return peer.toBroadcaster.splice(0)
}

export function drainAllBroadcasterSignals(videoId) {
  const room = rooms.get(videoId)
  if (!room) return []
  const out = []
  for (const [peerId, peer] of room.peers) {
    if (peer.toBroadcaster.length) {
      out.push({ peerId, messages: peer.toBroadcaster.splice(0) })
    }
  }
  return out
}
