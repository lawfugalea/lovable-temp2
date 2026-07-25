import { execFileSync, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const root = path.resolve('marketing/video')
const work = path.join(root, '.kinetic-work')
const output = path.join(root, 'output')
const cap = id => path.join(root, 'captures', `${id}.png`)
const bold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const narration = id => path.join(root, 'narration', 'kinetic', `${id}.mp3`)

const campaign = JSON.parse(await readFile(path.join(root, 'campaign.json'), 'utf8'))
const scenes = campaign.kinetic

// brand palette
const BLUE = '0x4D6BFF', PURPLE = '0x7B61FF', MINT = '0x2EE6C8', TEAL = '0x0EA5A5'
const WHITE = 'white', INK = '0x06202A'

const run = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })

// ---- sharp: build a rounded, bordered, drop-shadowed card from a screenshot ----
async function makeCard(src, out, targetW) {
  const resized = await sharp(src).resize({ width: targetW }).png().toBuffer()
  const m = await sharp(resized).metadata()
  const w = m.width, h = m.height, r = 34
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`)
  const rounded = await sharp(resized).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const border = Buffer.from(`<svg width="${w}" height="${h}"><rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="${r}" ry="${r}" fill="none" stroke="#ffffff" stroke-opacity="0.9" stroke-width="3"/></svg>`)
  const bordered = await sharp(rounded).composite([{ input: border }]).png().toBuffer()
  const pad = 70
  const W2 = w + pad * 2, H2 = h + pad * 2
  const shadowSvg = Buffer.from(`<svg width="${W2}" height="${H2}"><rect x="${pad}" y="${pad + 16}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#03060d" fill-opacity="0.55"/></svg>`)
  const shadow = await sharp(shadowSvg).blur(30).png().toBuffer()
  await sharp(shadow).composite([{ input: bordered, left: pad, top: pad }]).png().toFile(out)
  return { pad, w, h }
}

// ---- text helpers (drawtext with a fast snap-in: alpha ramp + small rise) ----
const esc = v => v.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", '’').replaceAll('%', '\\%')
function line({ text, x, y, size, color, delay = 0, center = false }) {
  const ax = center ? '(w-text_w)/2' : `${x}`
  const ay = `${y}-24*(1-clip((t-${delay})/0.22\\,0\\,1))`
  const alpha = `clip((t-${delay})/0.2\\,0\\,1)`
  return `drawtext=fontfile=${bold}:text='${esc(text)}':x=${ax}:y=${ay}:fontsize=${size}:fontcolor=${color}:alpha='${alpha}':shadowcolor=black@0.32:shadowx=2:shadowy=3`
}
function chip({ text, x, y, color, textColor = INK, delay = 0.12 }) {
  const w = Math.round(text.length * 15 + 46), h = 48
  const en = `gte(t\\,${delay})`
  return [
    `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}@0.95:t=fill:enable='${en}'`,
    `drawtext=fontfile=${bold}:text='${esc(text)}':x=${x + 23}:y=${y + 11}:fontsize=25:fontcolor=${textColor}:enable='${en}'`,
  ]
}

// ---- per-scene visual definitions (headlines/screens/chips/gradient) ----
const HEAD_L = 120       // left-aligned headline x
const VISUALS = {
  open: { bg: [BLUE, PURPLE], text: [
    line({ text: 'RUNNING A HOME', y: 420, size: 74, color: WHITE, center: true }),
    line({ text: 'SHOULD FEEL CALM.', y: 540, size: 98, color: WHITE, center: true, delay: 0.12 }),
  ] },
  lists: { bg: [PURPLE, BLUE], screen: { id: 'mobile-shopping', w: 430, x: 1330 }, chips: [{ text: 'FREE', x: HEAD_L, y: 306, color: MINT }], text: [
    line({ text: 'SHARED', x: HEAD_L, y: 396, size: 96, color: WHITE }),
    line({ text: 'LISTS', x: HEAD_L, y: 508, size: 96, color: MINT, delay: 0.1 }),
    line({ text: 'Everyone edits, live.', x: HEAD_L, y: 640, size: 40, color: WHITE, delay: 0.22 }),
  ] },
  meals: { bg: [BLUE, PURPLE], screen: { id: 'mobile-meals', w: 430, x: 1330 }, chips: [{ text: 'FREE', x: HEAD_L, y: 306, color: MINT }], text: [
    line({ text: 'PLAN THE', x: HEAD_L, y: 396, size: 88, color: WHITE }),
    line({ text: 'WHOLE WEEK', x: HEAD_L, y: 498, size: 88, color: MINT, delay: 0.1 }),
    line({ text: 'Chores sort themselves.', x: HEAD_L, y: 630, size: 40, color: WHITE, delay: 0.22 }),
  ] },
  medicine: { bg: [PURPLE, BLUE], screen: { id: 'mobile-medicine', w: 430, x: 1330 }, chips: [{ text: 'FREE + FAMILY', x: HEAD_L, y: 306, color: MINT }], text: [
    line({ text: 'NEVER MISS', x: HEAD_L, y: 396, size: 84, color: WHITE }),
    line({ text: 'A DOSE', x: HEAD_L, y: 494, size: 84, color: MINT, delay: 0.1 }),
    line({ text: 'Doses, times, reminders.', x: HEAD_L, y: 626, size: 40, color: WHITE, delay: 0.22 }),
  ] },
  money: { bg: [TEAL, BLUE], screen: { id: 'shopping-compare', w: 980, x: 900 }, chips: [{ text: 'FAMILY · MALTA', x: 90, y: 296, color: MINT }], text: [
    line({ text: 'SAME BASKET.', x: 90, y: 386, size: 62, color: WHITE }),
    line({ text: 'CHEAPEST SHOP.', x: 90, y: 468, size: 70, color: MINT, delay: 0.1 }),
    line({ text: 'It pays for itself.', x: 90, y: 604, size: 42, color: WHITE, delay: 0.6 }),
  ] },
  calm: { bg: [BLUE, PURPLE], text: [
    line({ text: 'EVERYTHING', y: 420, size: 80, color: WHITE, center: true }),
    line({ text: 'IN ONE CALM PLACE.', y: 536, size: 92, color: MINT, center: true, delay: 0.12 }),
  ] },
  cta: { bg: ['0x11162E', '0x4D3AA8'], text: [
    line({ text: 'ClanKeep', y: 250, size: 88, color: MINT, center: true }),
    line({ text: 'START FREE', y: 470, size: 110, color: WHITE, center: true, delay: 0.12 }),
    line({ text: 'clankeep.com', y: 620, size: 62, color: MINT, center: true, delay: 0.24 }),
    line({ text: 'No card needed.', y: 720, size: 38, color: WHITE, center: true, delay: 0.4 }),
  ] },
}

await rm(work, { recursive: true, force: true }); await mkdir(work, { recursive: true }); await mkdir(output, { recursive: true })

const whoosh = path.join(root, 'sfx', 'whoosh.wav')

async function renderScene(scene) {
  const v = VISUALS[scene.id]
  const dur = scene.duration
  const out = path.join(work, `${scene.id}.mp4`)
  const inputs = ['-f', 'lavfi', '-i', `gradients=s=1920x1080:c0=${v.bg[0]}:c1=${v.bg[1]}:x0=0:y0=0:x1=1920:y1=1080:speed=0.00001`,
    '-i', narration(scene.id), '-i', whoosh]
  let idx = 3
  let cardIdx = null
  if (v.screen) {
    const cardPng = path.join(work, `card-${scene.id}.png`)
    const card = await makeCard(cap(v.screen.id), cardPng, v.screen.w)
    v.screen._h = card.h
    inputs.push('-loop', '1', '-i', cardPng)
    cardIdx = idx++
  }
  const drawChain = [...v.text, ...(v.chips ? v.chips.flatMap(chip) : [])].join(',')
  let fc = `[0:v]trim=0:${dur},setpts=PTS-STARTPTS[bg];`
  let vlab = '[bg]'
  if (cardIdx !== null) {
    const s = v.screen
    const slideX = `${s.x - 70}+780*(1-clip(t/0.5\\,0\\,1))`
    const topY = Math.max(0, Math.round((1080 - s._h) / 2) - 70)
    fc += `[${cardIdx}:v]format=rgba,fade=t=in:st=0:d=0.4:alpha=1[card];${vlab}[card]overlay=x='${slideX}':y=${topY}[bgc];`
    vlab = '[bgc]'
  }
  fc += `${vlab}${drawChain},format=yuv420p[v];`
  fc += `[1:a]loudnorm=I=-16:TP=-1.5:LRA=7[nv];[2:a]volume=0.32[wh];[nv][wh]amix=inputs=2:duration=first:normalize=0,apad[a]`
  run([...inputs, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-t', `${dur}`, '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out])
  return out
}

const files = []
for (const scene of scenes) files.push(await renderScene(scene))

// concat scenes, then lay driving music under the whole thing
const list = path.join(work, 'list.txt')
await writeFile(list, files.map(f => `file '${f.replaceAll("'", "'\\''")}'`).join('\n'))
const voice = path.join(work, 'voice.mp4')
run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', voice])
const total = scenes.reduce((s, x) => s + x.duration, 0)
const music = path.join(root, 'music', 'playground-fun.mp3')
const final = path.join(output, 'clankeep-youtube-ad-kinetic-30s.mp4')

// mix voice + music bed (no normalization yet)
const pre = path.join(work, 'pre.mp4')
run(['-i', voice, '-stream_loop', '-1', '-i', music,
  '-filter_complex', `[1:a]volume=0.15,afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, total - 1.3)}:d=1.3[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]`,
  '-map', '0:v', '-map', '[a]', '-t', `${total}`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', pre])

// pass 1: measure loudness
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', pre, '-af', 'loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
const j = JSON.parse(probe.stderr.slice(probe.stderr.indexOf('{'), probe.stderr.lastIndexOf('}') + 1))
// pass 2: apply precise linear normalization + true-peak safety limiter
run(['-i', pre, '-af', `loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,alimiter=level=false:limit=0.9`,
  '-map', '0:v', '-map', '0:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final])

// captions sidecar
function srtTime(s) { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), sec = Math.floor(ms % 60000 / 1000), x = ms % 1000; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(x).padStart(3,'0')}` }
let at = 0
const srt = scenes.map((s, i) => { const start = at; at += s.duration; return `${i + 1}\n${srtTime(start)} --> ${srtTime(at - 0.12)}\n${s.text}\n` }).join('\n')
await writeFile(path.join(output, 'clankeep-youtube-ad-kinetic-30s.srt'), srt)
console.log('Kinetic ad rendered.')
