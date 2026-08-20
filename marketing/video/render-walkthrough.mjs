// Renders the long-form website walkthrough: a guided tour of every ClanKeep feature
// using the REAL app screen recordings (clips/*.webm) framed in a branded window,
// with natural ElevenLabs narration (narration/walkthrough/*.mp3), section titles,
// a progress bar, and the ClanKeep logo. Matches the ad's design system.
//
// Output: output/clankeep-website-walkthrough.mp4 (+ .srt)

import { execFileSync, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile, rm, access, readdir, copyFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const root = path.resolve('marketing/video')
const work = path.join(root, '.walk-work')
const output = path.join(root, 'output')
const clip = id => path.join(root, 'clips', `${id}.webm`)
const narration = id => path.join(root, 'narration', 'walkthrough', `${id}.mp3`)
const LOGO_LIGHT = path.resolve('src/assets/clankeep-logo.png')      // navy — for the white bug chip
const LOGO_DARK = path.resolve('src/assets/clankeep-logo-dark.png')  // light — for the dark title/CTA cards
const logoBuf = (src, width) => sharp(src).trim().resize({ width }).png().toBuffer()

const run = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
const exists = async p => { try { await access(p); return true } catch { return false } }
const dur = f => { const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }); return parseFloat(r.stdout) || 0 }
// find where a recording stops being a blank/white loading frame (first frame with dark pixels)
const contentStart = f => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YMIN:file=-', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 27 })
  let t = 0
  for (const line of (r.stdout || '').split('\n')) {
    const mt = line.match(/pts_time:([0-9.]+)/); if (mt) t = parseFloat(mt[1])
    const my = line.match(/YMIN=([0-9.]+)/); if (my && parseFloat(my[1]) < 150) return Math.max(0, t - 0.03)
  }
  return 0
}

async function ensureFonts() {
  const check = spawnSync('fc-list', [], { encoding: 'utf8' })
  if (check.status === 0 && /poppins/i.test(check.stdout)) return
  const src = path.join(root, 'fonts'); const dst = path.join(os.homedir(), '.local/share/fonts/clankeep')
  await mkdir(dst, { recursive: true })
  for (const f of await readdir(src)) if (f.endsWith('.ttf')) await copyFile(path.join(src, f), path.join(dst, f))
  spawnSync('fc-cache', ['-f', dst])
}
await ensureFonts()

const FONT = 'Poppins', INK = '#0B1F2A', TEAL = '#22D3C5'
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function txt({ t, x, y, size, weight = 800, fill = '#fff', ls = -1, anchor = 'start', shadow = true }) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" text-anchor="${anchor}" fill="${fill}"${shadow ? ' filter="url(#ds)"' : ''}>${xml(t)}</text>`
}
function frame(inner) {
  return `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><defs>` +
    `<filter id="ds" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="#02090f" flood-opacity="0.5"/></filter>` +
    `</defs>${inner}</svg>`
}
const svgPng = async (inner, out) => { await sharp(Buffer.from(frame(inner))).png().toFile(out); return out }

// ---- card geometry (recording shown at native 1440x900, crisp) ----
const CW = 1440, CH = 900, CX = 240, CY = 54, R = 24

// branded background: deep navy with a soft top glow
async function makeBg(out) {
  const svg = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><defs>` +
    `<radialGradient id="g" cx="50%" cy="-5%" r="85%"><stop offset="0" stop-color="#1b2a55" stop-opacity="0.75"/><stop offset="1" stop-color="#080d18" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="1920" height="1080" fill="#080d18"/><rect width="1920" height="1080" fill="url(#g)"/></svg>`
  await sharp(Buffer.from(svg)).png().toFile(out)
}
// rounded-corner alpha mask + drop shadow for the recording card
async function makeMaskShadow(maskOut, shadowOut) {
  await sharp(Buffer.from(`<svg width="${CW}" height="${CH}"><rect width="${CW}" height="${CH}" rx="${R}" ry="${R}" fill="#fff"/></svg>`)).toColourspace('b-w').png().toFile(maskOut)
  const pad = 80
  const sh = `<svg width="${CW + pad * 2}" height="${CH + pad * 2}"><rect x="${pad}" y="${pad + 20}" width="${CW}" height="${CH}" rx="${R}" ry="${R}" fill="#02060e" fill-opacity="0.6"/></svg>`
  await sharp(Buffer.from(sh)).blur(34).png().toFile(shadowOut)
}
// bottom-right ClanKeep logo bug on a white chip (also matches the ad)
const BUG_W = 300, BUG_H = 92, BUG_X = 1920 - BUG_W - 28, BUG_Y = 1080 - BUG_H - 24
async function makeBug(out) {
  const panel = Buffer.from(`<svg width="${BUG_W}" height="${BUG_H}"><rect width="${BUG_W}" height="${BUG_H}" rx="16" fill="#ffffff" fill-opacity="0.95"/></svg>`)
  const logo = await logoBuf(LOGO_LIGHT, 248)
  const m = await sharp(logo).metadata()
  await sharp(panel).composite([{ input: logo, left: Math.round((BUG_W - 248) / 2), top: Math.round((BUG_H - m.height) / 2) }]).png().toFile(out)
}

// ---- sections ----
const TITLES = {
  overview: ['Overview', 'Your whole home at a glance.'],
  shopping: ['Shopping & prices', 'Shared lists + Malta price comparison.'],
  meals: ['Meals', 'Plan the week, send to shopping.'],
  chores: ['Chores', 'Assign, track, and tick off.'],
  notes: ['Notes', 'Shared or private household notes.'],
  medicine: ['Medicine', 'Doses, temperatures & reminders.'],
  finance: ['Money', 'Budgets, goals & the AI savings coach.'],
  household: ['Household', 'Invite everyone into one shared home.'],
  pricing: ['Free & Family', 'Free forever. Family from €4.99/mo.'],
}
const campaign = JSON.parse(await readFile(path.join(root, 'campaign.json'), 'utf8'))
const ORDER = campaign.walkthrough.map(s => s.id) // intro, overview, ..., pricing, finish
const RECS = ORDER.filter(id => id !== 'intro' && id !== 'finish')

await rm(work, { recursive: true, force: true }); await mkdir(work, { recursive: true }); await mkdir(output, { recursive: true })
const bgPng = path.join(work, 'bg.png'); await makeBg(bgPng)
const maskPng = path.join(work, 'mask.png'); const shadowPng = path.join(work, 'shadow.png'); await makeMaskShadow(maskPng, shadowPng)
const bugPng = path.join(work, 'bug.png'); await makeBug(bugPng)

// voice chain (natural, no per-section loudnorm — master normalizes)
const voiceChain = 'highpass=f=80,equalizer=f=3000:width_type=o:width=1.5:g=1.5,acompressor=threshold=-18dB:ratio=2:attack=8:release=180:makeup=2,deesser=i=0.12,volume=1dB,alimiter=level=false:limit=0.95'

// title/lower-third overlay for a feature section (with progress bar)
async function makeTitle(id, frac, out) {
  const [t, d] = TITLES[id]
  const inner =
    txt({ t, x: CX, y: 1006, size: 54, weight: 800, fill: '#ffffff', ls: -1 }) +
    txt({ t: d, x: CX + 2, y: 1052, size: 30, weight: 500, fill: TEAL, ls: 0, shadow: false }) +
    `<rect x="0" y="1074" width="1920" height="6" fill="#ffffff" fill-opacity="0.12"/>` +
    `<rect x="0" y="1074" width="${Math.round(1920 * frac)}" height="6" fill="${TEAL}"/>`
  return svgPng(inner, out)
}

async function renderFeature(id, i) {
  const segDur = +(dur(narration(id)) + 0.55).toFixed(2)
  const cs = contentStart(clip(id))          // skip the blank/white loading frames
  const rd = dur(clip(id)) - cs
  const factor = (segDur / rd).toFixed(4)     // stretch remaining recording to fill the segment
  const titlePng = path.join(work, `title-${id}.png`); await makeTitle(id, (RECS.indexOf(id) + 1) / RECS.length, titlePng)
  const out = path.join(work, `${id}.mp4`)
  const fc =
    `[0:v]trim=start=${cs.toFixed(3)},setpts=PTS-STARTPTS,scale=${CW}:${CH},setsar=1,fps=30,setpts=${factor}*PTS,trim=0:${segDur},format=rgba[rec];` +
    `[2:v]format=gray[m];[rec][m]alphamerge[rounded];` +
    `[1:v]trim=0:${segDur},setpts=PTS-STARTPTS[bg];` +
    `[3:v]trim=0:${segDur},setpts=PTS-STARTPTS[sh];` +
    `[bg][sh]overlay=x=${CX - 80}:y=${CY - 60}[b1];` +
    `[b1][rounded]overlay=x=${CX}:y=${CY}[b2];` +
    `[4:v]trim=0:${segDur},setpts=PTS-STARTPTS[title];[b2][title]overlay=0:0[b3];` +
    `[5:v]trim=0:${segDur},setpts=PTS-STARTPTS[bug];[b3][bug]overlay=x=${BUG_X}:y=${BUG_Y}[vv];[vv]format=yuv420p[v];` +
    `[6:a]${voiceChain},apad[a]`
  run(['-i', clip(id), '-loop', '1', '-i', bgPng, '-loop', '1', '-i', maskPng, '-loop', '1', '-i', shadowPng,
    '-loop', '1', '-i', titlePng, '-loop', '1', '-i', bugPng, '-i', narration(id),
    '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-t', `${segDur}`, '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out])
  return out
}

async function renderCard(id, kind) {
  const segDur = +(dur(narration(id)) + (kind === 'intro' ? 0.9 : 1.6)).toFixed(2)
  const cardPng = path.join(work, `card-${id}.png`)
  let inner
  if (kind === 'intro') {
    inner = txt({ t: 'A guided tour', x: 960, y: 596, size: 40, weight: 500, fill: '#c7d3f0', anchor: 'middle', shadow: false }) +
      txt({ t: 'Everything your home needs, in one calm place.', x: 960, y: 660, size: 34, weight: 500, fill: TEAL, anchor: 'middle', shadow: false })
  } else {
    const btnW = 520, btnH = 112, bx = (1920 - btnW) / 2, by = 560
    inner = `<rect x="${bx}" y="${by}" width="${btnW}" height="${btnH}" rx="18" fill="${TEAL}" filter="url(#ds)"/>` +
      txt({ t: 'START FREE', x: 960, y: by + 76, size: 60, weight: 800, fill: INK, ls: -1, anchor: 'middle', shadow: false }) +
      txt({ t: 'clankeep.com', x: 960, y: 740, size: 52, weight: 700, fill: '#ffffff', anchor: 'middle', shadow: false }) +
      txt({ t: 'Free forever · no card needed', x: 960, y: 792, size: 30, weight: 500, fill: '#9fb2d6', anchor: 'middle', shadow: false })
  }
  const base = await sharp(Buffer.from(frame(inner))).png().toBuffer()
  const logo = await logoBuf(LOGO_DARK, 600)
  await sharp(bgPng).composite([{ input: logo, left: Math.round((1920 - 600) / 2), top: 300 }, { input: base, left: 0, top: 0 }]).png().toFile(cardPng)
  const out = path.join(work, `${id}.mp4`)
  const fc = `[0:v]trim=0:${segDur},setpts=PTS-STARTPTS,format=yuv420p[v];[1:a]${voiceChain},apad[a]`
  run(['-loop', '1', '-i', cardPng, '-i', narration(id),
    '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-t', `${segDur}`, '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out])
  return out
}

const files = []
for (const id of ORDER) {
  if (id === 'intro') files.push(await renderCard('intro', 'intro'))
  else if (id === 'finish') files.push(await renderCard('finish', 'finish'))
  else files.push(await renderFeature(id, files.length))
  console.log(`  ✓ ${id}`)
}

// concat + music bed + master loudness
const list = path.join(work, 'list.txt')
await writeFile(list, files.map(f => `file '${f.replaceAll("'", "'\\''")}'`).join('\n'))
const voice = path.join(work, 'voice.mp4')
run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', voice])
const total = dur(voice)
const music = path.join(root, 'music', 'playground-fun.mp3')
const pre = path.join(work, 'pre.mp4')
run(['-i', voice, '-stream_loop', '-1', '-i', music,
  '-filter_complex', `[1:a]volume=0.09,afade=t=in:d=0.6,afade=t=out:st=${Math.max(0, total - 1.6)}:d=1.6[mraw];[mraw][0:a]sidechaincompress=threshold=0.05:ratio=6:attack=5:release=300[mduck];[0:a][mduck]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[a]`,
  '-map', '0:v', '-map', '[a]', '-t', `${total}`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', pre])
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', pre, '-af', 'loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
const j = JSON.parse(probe.stderr.slice(probe.stderr.indexOf('{'), probe.stderr.lastIndexOf('}') + 1))
const final = path.join(output, 'clankeep-website-walkthrough.mp4')
run(['-i', pre, '-af', `loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,alimiter=level=false:limit=0.9`,
  '-map', '0:v', '-map', '0:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final])
run(['-ss', '5', '-i', final, '-frames:v', '1', '-q:v', '3', path.join(output, 'clankeep-website-walkthrough-poster.jpg')])

// captions sidecar
function srtTime(s) { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), sec = Math.floor(ms % 60000 / 1000), x = ms % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(x).padStart(3, '0')}` }
const byId = Object.fromEntries(campaign.walkthrough.map(s => [s.id, s]))
let at = 0, nS = 1; const srt = []
for (let i = 0; i < ORDER.length; i++) { const id = ORDER[i]; const d = dur(files[i]); srt.push(`${nS++}\n${srtTime(at)} --> ${srtTime(at + d - 0.1)}\n${byId[id].text}\n`); at += d }
await writeFile(path.join(output, 'clankeep-website-walkthrough.srt'), srt.join('\n'))

console.log(`Walkthrough rendered → ${path.relative(process.cwd(), final)} (${total.toFixed(1)}s)`)
