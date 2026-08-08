import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const root = path.resolve('marketing/video')
const capturesDir = path.join(root, 'captures')
const framesDir = path.join(root, 'frames')
const intermediateDir = path.join(root, 'intermediate')
const narrationDir = path.join(root, 'narration')
const outputDir = path.join(root, 'output')
const musicPath = path.join(root, 'music/playground-fun.mp3')
const logoPath = path.resolve('public/brand/clankeep-logo-email.png')
const scenes = JSON.parse(await readFile(path.join(root, 'scenes.json'), 'utf8'))

for (const dir of [framesDir, intermediateDir, outputDir]) await mkdir(dir, { recursive: true })

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`)
}

function output(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`)
  return result.stdout.trim()
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function lines(value, maxChars) {
  const words = value.split(/\s+/)
  const result = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      result.push(current)
      current = word
    } else current = next
  }
  if (current) result.push(current)
  return result
}

function textBlock(value, x, y, size, maxChars, lineHeight, weight = 700, color = '#151827') {
  return lines(value, maxChars).map((line, index) =>
    `<text x="${x}" y="${y + index * lineHeight}" font-family="DejaVu Sans, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(line)}</text>`,
  ).join('')
}

function palette(badge) {
  if (badge.startsWith('FREE') && !badge.includes('FAMILY')) return { fill: '#dff8f4', text: '#087f78' }
  if (badge.includes('FAMILY')) return { fill: '#ede8ff', text: '#6547e9' }
  return { fill: '#e8edff', text: '#4d6bff' }
}

async function roundedScreenshot(input, width, height) {
  const image = await sharp(input).resize(width, height, { fit: 'cover', position: 'top' }).png().toBuffer()
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="30" fill="white"/></svg>`)
  return sharp(image).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

async function makeLandscapeFrame(scene) {
  const width = 1920
  const height = 1080
  const shotWidth = 1320
  const shotHeight = 825
  const shotX = 520
  const shotY = 168
  const tone = palette(scene.badge)
  const titleLines = lines(scene.title, 15)
  const subtitleY = 278 + (titleLines.length - 1) * 52
  const chrome = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f7f9ff"/><stop offset="0.5" stop-color="#ffffff"/><stop offset="1" stop-color="#eefbf9"/>
      </linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#1d2748" flood-opacity="0.16"/></filter>
    </defs>
    <rect width="1920" height="1080" fill="url(#bg)"/>
    <circle cx="150" cy="960" r="340" fill="#ede8ff" opacity="0.65"/>
    <circle cx="1810" cy="10" r="300" fill="#dff8f4" opacity="0.7"/>
    <rect x="${shotX}" y="${shotY}" width="${shotWidth}" height="${shotHeight}" rx="30" fill="#ffffff" filter="url(#shadow)"/>
    <rect x="78" y="176" width="${Math.max(150, scene.badge.length * 17 + 48)}" height="46" rx="23" fill="${tone.fill}"/>
    <text x="102" y="207" font-family="DejaVu Sans, sans-serif" font-size="19" font-weight="800" letter-spacing="1.2" fill="${tone.text}">${escapeXml(scene.badge)}</text>
    ${textBlock(scene.title, 78, 286, 42, 15, 52, 800)}
    ${textBlock(scene.subtitle, 80, subtitleY + 62, 23, 24, 34, 500, '#5b6478')}
    <rect x="80" y="880" width="360" height="3" rx="2" fill="#4d6bff" opacity="0.65"/>
    <text x="80" y="920" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="700" fill="#4d6bff">TOGETHER. ORGANISED. AT HOME.</text>
  </svg>`)
  const shot = await roundedScreenshot(path.join(capturesDir, scene.image), shotWidth, shotHeight)
  const logo = await sharp(logoPath).resize({ width: 280 }).png().toBuffer()
  return sharp({ create: { width, height, channels: 4, background: '#ffffff' } })
    .composite([
      { input: chrome, left: 0, top: 0 },
      { input: logo, left: 76, top: 44 },
      { input: shot, left: shotX, top: shotY },
    ])
    .png()
    .toBuffer()
}

async function makeVerticalFrame(scene) {
  const width = 1080
  const height = 1920
  const shotWidth = 820
  const shotHeight = 1220
  const shotX = 130
  const shotY = 540
  const tone = palette(scene.badge)
  const titleLines = lines(scene.title, 24)
  const subtitleY = 280 + (titleLines.length - 1) * 66
  const chrome = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f6f8ff"/><stop offset="0.5" stop-color="#ffffff"/><stop offset="1" stop-color="#eafbf8"/>
      </linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#1d2748" flood-opacity="0.18"/></filter>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <circle cx="40" cy="1830" r="300" fill="#ede8ff" opacity="0.72"/>
    <circle cx="1050" cy="40" r="250" fill="#dff8f4" opacity="0.76"/>
    <rect x="${shotX}" y="${shotY}" width="${shotWidth}" height="${shotHeight}" rx="42" fill="#ffffff" filter="url(#shadow)"/>
    <rect x="70" y="164" width="${Math.max(160, scene.badge.length * 18 + 56)}" height="50" rx="25" fill="${tone.fill}"/>
    <text x="98" y="198" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="800" letter-spacing="1.1" fill="${tone.text}">${escapeXml(scene.badge)}</text>
    ${textBlock(scene.title, 70, 292, 52, 24, 66, 800)}
    ${textBlock(scene.subtitle, 72, subtitleY + 66, 26, 35, 38, 500, '#5b6478')}
    <text x="540" y="1852" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="21" font-weight="800" letter-spacing="1" fill="#4d6bff">CLANKEEP.COM</text>
  </svg>`)
  const shot = await roundedScreenshot(path.join(capturesDir, scene.image), shotWidth, shotHeight)
  const logo = await sharp(logoPath).resize({ width: 290 }).png().toBuffer()
  return sharp({ create: { width, height, channels: 4, background: '#ffffff' } })
    .composite([
      { input: chrome, left: 0, top: 0 },
      { input: logo, left: 70, top: 42 },
      { input: shot, left: shotX, top: shotY },
    ])
    .png()
    .toBuffer()
}

async function makeLandscapeDetailFrame(scene) {
  const width = 1920
  const height = 1080
  const shotWidth = 1780
  const shotHeight = 930
  const shotX = 70
  const shotY = 92
  const tone = palette(scene.badge)
  const chrome = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e9edff"/><stop offset="1" stop-color="#ddf8f4"/></linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#151827" flood-opacity="0.22"/></filter>
    </defs>
    <rect width="1920" height="1080" fill="url(#bg)"/>
    <rect x="${shotX}" y="${shotY}" width="${shotWidth}" height="${shotHeight}" rx="34" fill="#fff" filter="url(#shadow)"/>
  </svg>`)
  const calloutWidth = Math.min(980, Math.max(620, scene.title.length * 25 + 230))
  const overlay = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="callout"><feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#151827" flood-opacity="0.22"/></filter></defs>
    <rect x="112" y="120" width="${calloutWidth}" height="112" rx="28" fill="#ffffff" fill-opacity="0.96" filter="url(#callout)"/>
    <rect x="136" y="141" width="${Math.max(150, scene.badge.length * 15 + 42)}" height="34" rx="17" fill="${tone.fill}"/>
    <text x="156" y="165" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="800" letter-spacing="1" fill="${tone.text}">${escapeXml(scene.badge)}</text>
    <text x="138" y="211" font-family="DejaVu Sans, sans-serif" font-size="34" font-weight="800" fill="#151827">${escapeXml(scene.title)}</text>
    <circle cx="1800" cy="960" r="24" fill="#4d6bff" fill-opacity="0.92"/><circle cx="1800" cy="960" r="40" fill="none" stroke="#4d6bff" stroke-width="5" stroke-opacity="0.35"/>
  </svg>`)
  const shot = await roundedScreenshot(path.join(capturesDir, scene.image), shotWidth, shotHeight)
  return sharp({ create: { width, height, channels: 4, background: '#ffffff' } })
    .composite([{ input: chrome, left: 0, top: 0 }, { input: shot, left: shotX, top: shotY }, { input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer()
}

async function makeVerticalDetailFrame(scene) {
  const width = 1080
  const height = 1920
  const shotWidth = 970
  const shotHeight = 1640
  const shotX = 55
  const shotY = 210
  const tone = palette(scene.badge)
  const chrome = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e8edff"/><stop offset="1" stop-color="#dff8f4"/></linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="20" stdDeviation="26" flood-color="#151827" flood-opacity="0.24"/></filter>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <rect x="${shotX}" y="${shotY}" width="${shotWidth}" height="${shotHeight}" rx="44" fill="#fff" filter="url(#shadow)"/>
    <rect x="64" y="54" width="${Math.max(190, scene.badge.length * 18 + 62)}" height="52" rx="26" fill="${tone.fill}"/>
    <text x="94" y="89" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="800" letter-spacing="1" fill="${tone.text}">${escapeXml(scene.badge)}</text>
    ${textBlock(scene.title, 66, 164, 38, 38, 46, 800)}
    <circle cx="958" cy="1760" r="25" fill="#4d6bff" fill-opacity="0.92"/><circle cx="958" cy="1760" r="44" fill="none" stroke="#4d6bff" stroke-width="6" stroke-opacity="0.33"/>
  </svg>`)
  const shot = await roundedScreenshot(path.join(capturesDir, scene.image), shotWidth, shotHeight)
  return sharp({ create: { width, height, channels: 4, background: '#ffffff' } })
    .composite([{ input: chrome, left: 0, top: 0 }, { input: shot, left: shotX, top: shotY }])
    .png()
    .toBuffer()
}

function probeDuration(file) {
  return Number(output('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]))
}

function srtTime(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const secs = Math.floor((milliseconds % 60_000) / 1000)
  const ms = milliseconds % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function captionCues(scene, start, duration, indexStart) {
  const sentences = scene.narration.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(value => value.trim()).filter(Boolean) || [scene.narration]
  const weights = sentences.map(sentence => Math.max(1, sentence.split(/\s+/).length))
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  let cursor = start
  return sentences.map((sentence, index) => {
    const sentenceDuration = duration * weights[index] / totalWeight
    const cue = `${indexStart + index}\n${srtTime(cursor)} --> ${srtTime(cursor + sentenceDuration)}\n${sentence}\n`
    cursor += sentenceDuration
    return cue
  })
}

async function renderFormat(format) {
  const isLandscape = format === 'landscape'
  const width = isLandscape ? 1920 : 1080
  const height = isLandscape ? 1080 : 1920
  const formatScenes = scenes[format]
  const concatEntries = []
  const captionBlocks = []
  let timeline = 0
  let cueIndex = 1

  for (const [index, scene] of formatScenes.entries()) {
    const framePath = path.join(framesDir, `${format}-${scene.id}.png`)
    const detailFramePath = path.join(framesDir, `${format}-${scene.id}-detail.png`)
    const frame = isLandscape ? await makeLandscapeFrame(scene) : await makeVerticalFrame(scene)
    const detailFrame = isLandscape ? await makeLandscapeDetailFrame(scene) : await makeVerticalDetailFrame(scene)
    await writeFile(framePath, frame)
    await writeFile(detailFramePath, detailFrame)

    const narrationPath = path.join(narrationDir, format, `${scene.id}.mp3`)
    const narrationDuration = probeDuration(narrationPath)
    const scenePadding = isLandscape ? 0.72 : 0.55
    const sceneDuration = narrationDuration + scenePadding
    const scenePath = path.join(intermediateDir, `${format}-${String(index + 1).padStart(2, '0')}-${scene.id}.mp4`)
    const fadeOutStart = Math.max(0, sceneDuration - 0.22).toFixed(3)
    const transitionDuration = isLandscape ? 0.62 : 0.48
    const transitionAt = Math.max(1.6, Math.min(narrationDuration * 0.43, narrationDuration - transitionDuration - 0.5))
    const transitions = isLandscape
      ? ['smoothleft', 'slideup', 'circleopen', 'coverleft', 'zoomin', 'revealup']
      : ['coverup', 'smoothleft', 'zoomin', 'revealup', 'slideleft', 'circleopen']
    const transition = transitions[index % transitions.length]
    const filter = [
      `[0:v]scale=${width}:${height},zoompan=z='max(1.045-on*0.00020,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=30,settb=AVTB,setpts=PTS-STARTPTS[card]`,
      `[1:v]scale=${width}:${height},zoompan=z='min(1.0+on*0.00016,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=30,settb=AVTB,setpts=PTS-STARTPTS[detail]`,
      `[card][detail]xfade=transition=${transition}:duration=${transitionDuration.toFixed(3)}:offset=${transitionAt.toFixed(3)},fade=t=in:st=0:d=0.16,fade=t=out:st=${fadeOutStart}:d=0.22,format=yuv420p[video]`,
    ].join(';')
    run('ffmpeg', [
      '-y', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-i', framePath,
      '-loop', '1', '-framerate', '30', '-i', detailFramePath,
      '-i', narrationPath, '-filter_complex', filter, '-map', '[video]', '-map', '2:a', '-t', sceneDuration.toFixed(3),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-r', '30',
      '-af', `apad=pad_dur=${scenePadding.toFixed(3)}`,
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', scenePath,
    ])
    concatEntries.push(`file '${scenePath.replaceAll("'", "'\\''")}'`)
    const cues = captionCues(scene, timeline, narrationDuration, cueIndex)
    captionBlocks.push(...cues)
    cueIndex += cues.length
    timeline += sceneDuration
    console.log(`rendered ${format} scene ${index + 1}/${formatScenes.length}: ${scene.id}`)
  }

  const concatPath = path.join(intermediateDir, `${format}-concat.txt`)
  await writeFile(concatPath, `${concatEntries.join('\n')}\n`)
  const voiceOnly = path.join(intermediateDir, `${format}-voice.mp4`)
  run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', voiceOnly])

  const outputPath = path.join(outputDir, `clankeep-promo-${format}.mp4`)
  const fadeMusicAt = Math.max(0, timeline - 2).toFixed(3)
  run('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', voiceOnly, '-stream_loop', '-1', '-i', musicPath,
    '-filter_complex', `[1:a]volume=0.085,afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeMusicAt}:d=2[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=0,loudnorm=I=-14:TP=-2:LRA=11[audio]`,
    '-map', '0:v', '-map', '[audio]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', '-t', timeline.toFixed(3), outputPath,
  ])

  const srtPath = path.join(outputDir, `clankeep-promo-${format}.srt`)
  await writeFile(srtPath, `${captionBlocks.join('\n')}\n`)
  console.log(`finished ${outputPath} (${timeline.toFixed(1)} seconds)`)
}

for (const required of [musicPath, ...scenes.landscape.map(scene => path.join(narrationDir, 'landscape', `${scene.id}.mp3`))]) {
  await readFile(required).catch(() => { throw new Error(`Missing required asset: ${required}`) })
}

await renderFormat('landscape')
await renderFormat('vertical')
