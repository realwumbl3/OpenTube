import { randomUUID } from 'crypto'
import {
  DEFAULT_USER_ID,
  getUserById,
  createUserRecord,
  createSeededVideoRecord,
  addSubscriptionRecord,
  getDemoSeeded,
  setDemoSeeded,
  clearDemoSeedData,
  setUserQuickSwitch,
} from './store.js'

const PERSONA_NAMES = [
  'Aurora Vlogs',
  'Byte Review',
  'Cosmic Clips',
  'Desk Setups',
  'Echo Music',
  'Forklift Films',
  'Garden Hours',
  'Hype Skate',
  'Idle Theory',
  'Jazz Loft',
]

const SAMPLE_MP4 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

const TITLE_BITS = [
  'Morning routine',
  'Unboxing',
  'Live stream highlights',
  'Tutorial part',
  'Road trip diary',
  'Studio session',
  'Q&A',
  'Behind the scenes',
  'Challenge attempt',
  'Week in review',
]

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1))
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function mulberry32(seed) {
  return function rng() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function isoDaysAgo(rng, days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(randInt(rng, 0, 23), randInt(rng, 0, 59), randInt(rng, 0, 59), 0)
  return d.toISOString()
}

function thumbForId(id) {
  return `https://picsum.photos/seed/${encodeURIComponent(id)}/640/360`
}

function ensurePersonas(rng) {
  const ids = []
  for (let i = 0; i < PERSONA_NAMES.length; i++) {
    const n = String(i + 1).padStart(2, '0')
    const id = `user-persona-${n}`
    createUserRecord({
      id,
      username: `persona${n}`,
      display_name: PERSONA_NAMES[i],
      quick_switch: true,
    })
    ids.push(id)
  }
  const main = getUserById(DEFAULT_USER_ID)
  if (main && main.quick_switch !== true) {
    setUserQuickSwitch(DEFAULT_USER_ID, true)
  }
  return [DEFAULT_USER_ID, ...ids]
}

function seedFakeUsers(rng, personaIds) {
  const fakeIds = []
  for (let i = 1; i <= 100; i++) {
    const n = String(i).padStart(3, '0')
    const id = `user-fake-${n}`
    const display = `Channel ${n}`
    createUserRecord({
      id,
      username: `ch${n}`,
      display_name: display,
      quick_switch: false,
    })
    fakeIds.push(id)
  }

  const allChannels = [...personaIds, ...fakeIds]

  for (const userId of allChannels) {
    const videoCount =
      userId === DEFAULT_USER_ID ? randInt(rng, 0, 3) : randInt(rng, 0, 12)
    for (let v = 0; v < videoCount; v++) {
      const vid = randomUUID()
      const title = `${pick(rng, TITLE_BITS)} — ${pick(rng, ['vol.', 'ep.', '#'])}${randInt(rng, 1, 99)}`
      const created = isoDaysAgo(rng, randInt(rng, 3, 400))
      createSeededVideoRecord({
        id: vid,
        userId,
        title,
        description: `Auto-generated demo upload for ${userId}.`,
        created_at: created,
        views: randInt(rng, 12, 500000),
        duration_sec: randInt(rng, 45, 3600),
        thumb_path: thumbForId(vid),
        variant_url: SAMPLE_MP4,
      })
    }
  }

  for (const userId of allChannels) {
    const subCount = randInt(rng, 0, 18)
    const targets = new Set()
    while (targets.size < subCount) {
      const target = pick(rng, allChannels)
      if (target !== userId) targets.add(target)
    }
    for (const channelId of targets) {
      const subDays = randInt(rng, 1, 360)
      const subAt = isoDaysAgo(rng, subDays)
      addSubscriptionRecord(userId, channelId, subAt)
    }
  }

  for (const personaId of personaIds) {
    if (personaId === DEFAULT_USER_ID) continue
    if (rng() > 0.35) {
      addSubscriptionRecord(personaId, DEFAULT_USER_ID, isoDaysAgo(rng, randInt(rng, 5, 200)))
    }
  }
}

export function ensureDemoSeed() {
  const force = process.env.RESEED_DEMO === '1'
  if (getDemoSeeded() && !force) return { skipped: true }

  if (force) clearDemoSeedData()

  const rng = mulberry32(0xfacefeed)
  const personaIds = ensurePersonas(rng)
  seedFakeUsers(rng, personaIds)
  setDemoSeeded(true)
  return { skipped: false }
}
