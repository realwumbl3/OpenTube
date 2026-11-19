import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { storageDir, upsertVariant, setVideoReady, setVideoFailed, root } from './store.js'

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    proc.stderr.on('data', (d) => {
      err += d.toString()
    })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(err.slice(-800) || `ffmpeg exited ${code}`))
    })
  })
}

async function probeDuration(inputPath) {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ])
    let out = ''
    proc.stdout.on('data', (d) => { out += d.toString() })
    proc.on('close', () => {
      const sec = Math.floor(parseFloat(out.trim()) || 0)
      resolve(sec)
    })
  })
}

export async function processVideo(videoId) {
  const dir = path.join(storageDir, videoId)
  const original = path.join(dir, 'original')
  const entries = fs.readdirSync(dir).filter((f) => f.startsWith('original'))
  const originalFile = entries.length ? path.join(dir, entries[0]) : original
  if (!fs.existsSync(originalFile)) {
    setVideoFailed(videoId)
    return
  }

  const thumb = path.join(dir, 'thumb.jpg')
  await runFfmpeg([
    '-y', '-i', originalFile, '-ss', '00:00:01', '-vframes', '1',
    '-vf', 'scale=640:-1', thumb,
  ])

  const duration = await probeDuration(originalFile)

  const variants = [
    { label: '360', height: 360, name: '360.mp4' },
    { label: '720', height: 720, name: '720.mp4' },
  ]

  upsertVariant(videoId, 'original', path.relative(root, originalFile), null, null)

  for (const v of variants) {
    const outPath = path.join(dir, v.name)
    await runFfmpeg([
      '-y', '-i', originalFile,
      '-vf', `scale=-2:${v.height}`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      outPath,
    ])
    upsertVariant(
      videoId,
      v.label,
      path.relative(root, outPath),
      -2,
      v.height
    )
  }

  setVideoReady(videoId, path.relative(root, thumb), duration)
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
