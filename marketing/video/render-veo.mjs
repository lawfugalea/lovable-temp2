// Renders the bold Veo-3 cut of the 30s ClanKeep YouTube ad.
//
// Inputs:
//   ai-scenes/veo/{01-hook,02-demo,03-money,04-cta}.mp4  — your Veo 3 clips (16:9).
//        If a clip is missing, a labelled PLACEHOLDER scene is generated so the
//        whole pipeline still renders end-to-end. Drop the real clips in and re-run.
//   narration/ad/*.mp3   — ElevenLabs "Sarah" read (already present).
//   captures/*.png       — real ClanKeep UI, composited as inset cards.
//   public/brand/clankeep-logo-email.png — the real transparent brand lockup.
//   fonts/Poppins-*.ttf  — brand-coherent display type (register once, see README).
//   music/, sfx/         — bed + interface sound effects.
//
// Typography is rendered as SVG→PNG overlays (Poppins, brand gradients, glass
// panels, soft shadows) — not ffmpeg drawtext — for a premium look. The real
// ClanKeep logo lockup is used for the CTA and the bottom-right brand bug, which on
// free Google Flow also covers the Veo watermark corner (SynthID is left intact).
//
// Output: output/clankeep-youtube-ad-veo-30s.{mp4,srt} + poster jpg.

import { execFileSync, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile, rm, access, readdir, copyFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

// Register the bundled brand font (Poppins) with fontconfig so sharp/librsvg can
// render it. Idempotent: skips if already available. Keeps re-runs self-contained.
async function ensureFonts() {
  const check = spawnSync('fc-list', [], { encoding: 'utf8' })
  if (check.status === 0 && /poppins/i.test(check.stdout)) return
  const src = path.resolve('marketing/video/fonts')
  const dst = path.join(os.homedir(), '.local/share/fonts/clankeep')
  await mkdir(dst, { recursive: true })
  for (const f of await readdir(src)) if (f.endsWith('.ttf')) await copyFile(path.join(src, f), path.join(dst, f))
  spawnSync('fc-cache', ['-f', dst])
}
await ensureFonts()

const root = path.resolve('marketing/video')
const work = path.join(root, '.veo-work')
const output = path.join(root, 'output')
const veo = id => path.join(root, 'ai-scenes', 'veo', id)
const cap = id => path.join(root, 'captures', `${id}.png`)
const sfxFile = name => path.join(root, 'sfx', `${name}.wav`)
const narration = id => path.join(root, 'narration', 'ad', `${id}.mp3`)
const LOGO_LIGHT = path.resolve('src/assets/clankeep-logo.png')      // navy wordmark — for light/white backgrounds
const LOGO_DARK = path.resolve('src/assets/clankeep-logo-dark.png')  // light wordmark — for dark backgrounds
const logoBuf = (src, width) => sharp(src).trim().resize({ width }).png().toBuffer() // high-res source, trimmed, crisp

const run = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
const exists = async p => { try { await access(p); return true } catch { return false } }
const hasAudio = clip => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', clip], { encoding: 'utf8' })
  return r.status === 0 && r.stdout.trim().length > 0
}

// ---------- premium SVG type system ----------
const FONT = 'Poppins'
const INK = '#0B1F2A'
// Solid accents only — no gradient text (reads as AI-slop). Emphasis via colour + weight.
const TEAL = '#22D3C5'
const CORAL = '#FF6F61'
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function frame(inner) {
  return `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><defs>
    <linearGradient id="gBP" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4D6BFF"/><stop offset="1" stop-color="#7B61FF"/></linearGradient>
    <linearGradient id="gTB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#20C5C8"/><stop offset="1" stop-color="#4D6BFF"/></linearGradient>
    <linearGradient id="gCP" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF6B6B"/><stop offset="1" stop-color="#7B61FF"/></linearGradient>
    <linearGradient id="leftScrim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#04101c" stop-opacity="0.72"/><stop offset="1" stop-color="#04101c" stop-opacity="0"/></linearGradient>
    <linearGradient id="topScrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04101c" stop-opacity="0.62"/><stop offset="1" stop-color="#04101c" stop-opacity="0"/></linearGradient>
    <filter id="ds" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="9" flood-color="#02090f" flood-opacity="0.55"/></filter>
  </defs>${inner}</svg>`
}
function txt({ t, x, y, size, weight = 800, fill = '#ffffff', ls = -1, anchor = 'start', shadow = true }) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" text-anchor="${anchor}" fill="${fill}"${shadow ? ' filter="url(#ds)"' : ''}>${xml(t)}</text>`
}
// solid badge (not glass): filled pill, dark ink label
function pill({ t, x, y, fill = TEAL, textFill = INK }) {
  const w = Math.round(t.length * 16.5 + 60), h = 54
  return `<g filter="url(#ds)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}"/>` +
    `<text x="${x + 30}" y="${y + 37}" font-family="${FONT}" font-weight="700" font-size="26" letter-spacing="1.2" fill="${textFill}">${xml(t)}</text></g>`
}
// short accent rule (used instead of decorative glass/eyebrows)
function rule({ x, y, w = 84, color = TEAL }) {
  return `<rect x="${x}" y="${y}" width="${w}" height="6" rx="3" fill="${color}"/>`
}
async function svgPng(inner, out) { await sharp(Buffer.from(frame(inner))).png().toFile(out); return out }

// ---------- brand assets ----------
// bottom-right brand bug: white frosted panel (flush corner) + real logo lockup.
const BUG_W = 372, BUG_H = 116, BUG_X = 1920 - BUG_W, BUG_Y = 1080 - BUG_H
async function makeBug(out) {
  const panel = Buffer.from(
    `<svg width="${BUG_W}" height="${BUG_H}" xmlns="http://www.w3.org/2000/svg">
       <path d="M32,0 H${BUG_W} V${BUG_H} H0 V32 Q0,0 32,0 Z" fill="#ffffff" fill-opacity="0.95"/>
       <rect x="0" y="0" width="${BUG_W}" height="5" fill="#4D6BFF"/>
     </svg>`)
  const logo = await logoBuf(LOGO_LIGHT, 300)
  const m = await sharp(logo).metadata()
  await sharp(panel).composite([{ input: logo, left: Math.round((BUG_W - 300) / 2), top: Math.round((BUG_H - m.height) / 2) }]).png().toFile(out)
}

// full-frame CTA layer: dark scrim + real logo lockup + START FREE / url / subline.
async function makeCta(out) {
  const btnW = 520, btnH = 116, btnX = (1920 - btnW) / 2, btnY = 512
  const inner =
    `<rect width="1920" height="1080" fill="#050c1a" fill-opacity="0.62"/>` +
    txt({ t: 'Everything your home needs — in one calm place.', x: 960, y: 470, size: 40, weight: 500, fill: '#e6edff', ls: 0, anchor: 'middle', shadow: false }) +
    `<rect x="${btnX}" y="${btnY}" width="${btnW}" height="${btnH}" rx="18" fill="${TEAL}" filter="url(#ds)"/>` +
    txt({ t: 'START FREE', x: 960, y: btnY + 80, size: 62, weight: 800, fill: INK, ls: -1, anchor: 'middle', shadow: false }) +
    txt({ t: 'clankeep.com', x: 960, y: 720, size: 58, weight: 700, fill: '#ffffff', ls: -0.5, anchor: 'middle', shadow: false }) +
    txt({ t: 'Free forever · no card needed', x: 960, y: 776, size: 32, weight: 500, fill: '#9fb2d6', ls: 0.3, anchor: 'middle', shadow: false })
  const base = await sharp(Buffer.from(frame(inner))).png().toBuffer()
  const logo = await logoBuf(LOGO_DARK, 540)
  const m = await sharp(logo).metadata()
  await sharp(base).composite([{ input: logo, left: Math.round((1920 - 540) / 2), top: 226 }]).png().toFile(out)
}

// ---------- sharp: rounded, bordered, drop-shadowed screenshot card ----------
async function makeCard(src, out, targetW) {
  const resized = await sharp(src).resize({ width: targetW }).png().toBuffer()
  const m = await sharp(resized).metadata()
  const w = m.width, h = m.height, r = 34
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`)
  const rounded = await sharp(resized).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const border = Buffer.from(`<svg width="${w}" height="${h}"><rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="${r}" ry="${r}" fill="none" stroke="#ffffff" stroke-opacity="0.9" stroke-width="3"/></svg>`)
  const bordered = await sharp(rounded).composite([{ input: border }]).png().toBuffer()
  const pad = 70, W2 = w + pad * 2, H2 = h + pad * 2
  const shadowSvg = Buffer.from(`<svg width="${W2}" height="${H2}"><rect x="${pad}" y="${pad + 16}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#03060d" fill-opacity="0.55"/></svg>`)
  const shadow = await sharp(shadowSvg).blur(30).png().toBuffer()
  await sharp(shadow).composite([{ input: bordered, left: pad, top: pad }]).png().toFile(out)
  return { pad, w, h }
}

// one montage frame: a screenshot card centred at (cx,cy) with a solid label tag on it
async function makeMontageFrame(screenId, label, out, cardW, cx, cy) {
  const cardTmp = path.join(work, `mcard-${screenId}.png`)
  await makeCard(cap(screenId), cardTmp, cardW)
  const cardBuf = await sharp(cardTmp).png().toBuffer()
  const cm = await sharp(cardBuf).metadata()
  const left = Math.round(cx - cm.width / 2), top = Math.round(cy - cm.height / 2)
  const labelFrame = await sharp(Buffer.from(frame(pill({ t: label, x: left + 92, y: top + 92, fill: TEAL })))).png().toBuffer()
  await sharp({ create: { width: 1920, height: 1080, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cardBuf, left, top }, { input: labelFrame, left: 0, top: 0 }])
    .png().toFile(out)
}

// ---------- scenes: 4 Veo clips fitted to campaign.json `ad` narration (30.0s) ----------
const L = 120 // left margin for text-on-left scenes
const SCENES = [
  { id: 'hook', clip: '01-hook.mp4', dur: 9.0, vo: ['hook', 'mess'], ph: ['#4D6BFF', '#7B61FF'],
    layers: [
      { delay: 0, rise: false, inner: `<rect x="0" y="0" width="1920" height="470" fill="url(#topScrim)"/>` },
      { delay: 0.2, rise: true, inner:
        txt({ t: '5 apps. A group chat.', x: 960, y: 360, size: 76, weight: 600, fill: '#ffffff', ls: -2, anchor: 'middle' }) +
        txt({ t: 'And still — chaos.', x: 960, y: 476, size: 104, weight: 800, fill: TEAL, ls: -3, anchor: 'middle' }) },
      { delay: 5.5, rise: true, inner:
        `<rect x="516" y="858" width="888" height="92" rx="16" fill="#0B1F2A" fill-opacity="0.86"/>` +
        txt({ t: 'Wait — who gave the medicine?', x: 960, y: 916, size: 42, weight: 600, fill: '#ffffff', ls: -0.5, anchor: 'middle', shadow: false }) },
    ] },
  { id: 'demo', clip: '02-demo.mp4', dur: 6.9, vo: ['demo'], ph: ['#7B61FF', '#4D6BFF'],
    montage: { start: 1.2, each: 0.82, cardW: 860, cx: 1250, cy: 556, items: [
      { id: 'shopping-list', label: 'SHOPPING' },
      { id: 'meals', label: 'MEALS' },
      { id: 'chores', label: 'CHORES' },
      { id: 'medicine', label: 'MEDICINE' },
      { id: 'finances', label: 'MONEY' },
      { id: 'notes', label: 'NOTES' },
    ] },
    layers: [
      { delay: 0, rise: false, inner: `<rect x="0" y="0" width="760" height="1080" fill="url(#leftScrim)"/>` },
      { delay: 0.2, rise: true, inner:
        pill({ t: 'FREE + FAMILY', x: L, y: 300, fill: TEAL }) +
        txt({ t: 'ALL OF IT.', x: L, y: 456, size: 78, weight: 700, fill: '#ffffff', ls: -2 }) +
        txt({ t: 'ONE APP.', x: L, y: 546, size: 92, weight: 800, fill: TEAL, ls: -2 }) },
      { delay: 0.5, rise: true, inner:
        txt({ t: 'Shopping, meals, money,', x: L + 2, y: 640, size: 34, weight: 500, fill: '#dfe8ff', shadow: false }) +
        txt({ t: 'medicine, notes & more.', x: L + 2, y: 684, size: 34, weight: 500, fill: '#dfe8ff', shadow: false }) },
    ] },
  { id: 'money', clip: '03-money.mp4', dur: 6.0, vo: ['money'], ph: ['#20C5C8', '#4D6BFF'], sfx: [{ name: 'success', at: 3.0, vol: 0.5 }],
    screen: { id: 'shopping-compare', w: 900, x: 960 },
    layers: [
      { delay: 0, rise: false, inner: `<rect x="0" y="0" width="940" height="1080" fill="url(#leftScrim)"/>` },
      { delay: 0.2, rise: true, inner:
        pill({ t: 'FAMILY · MALTA', x: L, y: 292, fill: CORAL, textFill: '#ffffff' }) +
        txt({ t: 'SAME BASKET.', x: L, y: 448, size: 64, weight: 700, fill: '#ffffff', ls: -2 }) +
        txt({ t: 'CHEAPEST SHOP.', x: L, y: 534, size: 76, weight: 800, fill: TEAL, ls: -2 }) },
      { delay: 0.6, rise: true, inner:
        txt({ t: 'It pays for itself.', x: L + 2, y: 636, size: 44, weight: 700, fill: CORAL, ls: -0.5 }) },
    ] },
  { id: 'cta', clip: '04-cta.mp4', dur: 8.1, vo: ['calm', 'cta'], ph: ['#11162E', '#4D3AA8'], sfx: [{ name: 'ping', at: 4.6, vol: 0.4 }],
    ctaLayer: { delay: 4.6, rise: true } },
]

await rm(work, { recursive: true, force: true }); await mkdir(work, { recursive: true }); await mkdir(output, { recursive: true })

const bugPng = path.join(work, 'bug.png'); await makeBug(bugPng)
const ctaPng = path.join(work, 'cta.png'); await makeCta(ctaPng)

// Labelled placeholder clip (8s, silent audio) for any missing Veo scene.
async function placeholder(scene) {
  const out = path.join(work, `ph-${scene.id}.mp4`)
  await svgPng(`<rect width="1920" height="1080" fill="#0b1220"/>` +
    txt({ t: `PLACEHOLDER — VEO ${scene.id.toUpperCase()}`, x: 960, y: 980, size: 30, weight: 600, fill: '#ffffffcc', anchor: 'middle', shadow: false }) +
    txt({ t: `drop ${scene.clip} in ai-scenes/veo/`, x: 960, y: 1024, size: 24, weight: 500, fill: '#9fb0c8', anchor: 'middle', shadow: false }),
    path.join(work, `ph-${scene.id}.png`))
  run(['-f', 'lavfi', '-i', `gradients=s=1920x1080:c0=${scene.ph[0]}:c1=${scene.ph[1]}:x0=0:y0=0:x1=1920:y1=1080:speed=0.00001`,
    '-loop', '1', '-i', path.join(work, `ph-${scene.id}.png`), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-filter_complex', '[0:v][1:v]overlay[v]', '-map', '[v]', '-map', '2:a', '-t', '8',
    '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-shortest', out])
  return out
}

async function renderScene(scene) {
  const dur = scene.dur
  const out = path.join(work, `${scene.id}.mp4`)
  const realClip = veo(scene.clip)
  const clip = (await exists(realClip)) ? realClip : await placeholder(scene)
  const usingPlaceholder = clip !== realClip

  const inputs = ['-i', clip]
  let idx = 1
  const voInputs = []
  for (const v of scene.vo) { inputs.push('-i', narration(v)); voInputs.push(idx++) }

  // screenshot card
  let cardIdx = null
  if (scene.screen) {
    const cardPng = path.join(work, `card-${scene.id}.png`)
    const card = await makeCard(cap(scene.screen.id), cardPng, scene.screen.w)
    scene.screen._h = card.h
    inputs.push('-loop', '1', '-i', cardPng)
    cardIdx = idx++
  }

  // text overlay layers (pre-rendered full-frame PNGs)
  const layerDefs = scene.layers ? [...scene.layers] : []
  const layerIdx = []
  for (let i = 0; i < layerDefs.length; i++) {
    const p = path.join(work, `layer-${scene.id}-${i}.png`)
    await svgPng(layerDefs[i].inner, p)
    inputs.push('-loop', '1', '-i', p); layerIdx.push(idx++)
  }
  // feature montage frames (demo scene): screenshot cards that swap rapidly
  const montIdx = []
  if (scene.montage) {
    for (let i = 0; i < scene.montage.items.length; i++) {
      const it = scene.montage.items[i]
      const mp = path.join(work, `mont-${scene.id}-${i}.png`)
      await makeMontageFrame(it.id, it.label, mp, scene.montage.cardW, scene.montage.cx, scene.montage.cy)
      inputs.push('-loop', '1', '-i', mp); montIdx.push(idx++)
    }
  }

  // CTA composite layer (real logo lockup)
  let ctaIdx = null
  if (scene.ctaLayer) { inputs.push('-loop', '1', '-i', ctaPng); ctaIdx = idx++ }

  // brand bug (always, on top)
  inputs.push('-loop', '1', '-i', bugPng); const bugIdx = idx++

  // sfx
  const sfxInputs = []
  for (const s of (scene.sfx || [])) { inputs.push('-i', sfxFile(s.name)); sfxInputs.push({ idx: idx++, ...s }) }

  // ---------- video graph ----------
  // Fill 1920x1080, then crop out Flow's bottom-right Veo watermark (inset ~x1745,y900)
  // by dropping the right/edge margins and rescaling — clean removal, ~13% zoom.
  let fc = `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,` +
    `crop=1690:950:0:65,scale=1920:1080,` +
    // cinematic finish: gentle grade + vignette + fine film grain for cohesion
    `eq=contrast=1.06:saturation=1.08:brightness=0.006,vignette=PI/5.2,` +
    `setsar=1,fps=30,` +
    `tpad=stop_mode=clone:stop_duration=12,trim=0:${dur},setpts=PTS-STARTPTS[bg];`
  let vlab = '[bg]'
  let n = 0
  const put = (srcIdx, def) => {
    const o = `[v${n}]`
    // ease-out-cubic rise: y = riseY * (1-x)^3, x = normalized time since delay
    const yexpr = def.rise ? `${def.riseY || 26}*pow(1-clip((t-${def.delay})/0.6\\,0\\,1)\\,3)` : '0'
    fc += `[${srcIdx}:v]format=rgba,fade=t=in:st=${def.delay}:d=0.5:alpha=1[fl${n}];${vlab}[fl${n}]overlay=x=0:y='${yexpr}'${o};`
    vlab = o; n++
  }

  if (cardIdx !== null) {
    const s = scene.screen
    const slideX = `${s.x - 70}+900*pow(1-clip(t/0.7\\,0\\,1)\\,3)`
    const topY = Math.max(0, Math.round((1080 - s._h) / 2) - 70)
    fc += `[${cardIdx}:v]format=rgba,fade=t=in:st=0:d=0.5:alpha=1[card];${vlab}[card]overlay=x='${slideX}':y=${topY}[vc];`
    vlab = '[vc]'
  }
  layerIdx.forEach((li, i) => put(li, layerDefs[i]))
  // feature montage: each card fades in on top of the previous, swapping every `each`s
  if (scene.montage) {
    const m = scene.montage
    montIdx.forEach((mi, i) => {
      const s = (m.start + i * m.each).toFixed(2)
      const o = `[mv${i}]`
      fc += `[${mi}:v]format=rgba,fade=t=in:st=${s}:d=0.2:alpha=1[mf${i}];${vlab}[mf${i}]overlay=x=0:y=0${o};`
      vlab = o
    })
  }
  if (ctaIdx !== null) put(ctaIdx, scene.ctaLayer)
  // brand bug (fade in, static, flush corner)
  fc += `[${bugIdx}:v]format=rgba,fade=t=in:st=0:d=0.4:alpha=1[bug];${vlab}[bug]overlay=x=${BUG_X}:y=${BUG_Y}[vb];[vb]format=yuv420p[v];`

  // ---------- audio graph ----------
  let voLab
  if (voInputs.length === 1) { voLab = `[${voInputs[0]}:a]` }
  else {
    fc += `${voInputs.map(i => `[${i}:a]`).join('')}concat=n=${voInputs.length}:v=0:a=1[vocat];`
    voLab = '[vocat]'
  }
  // broadcast voice chain: clean lows, cut mud, lift presence + air, compress, de-ess, level.
  // NOTE: no per-scene loudnorm — single-pass dynamic loudnorm truncates the voice mid-line
  // when it feeds amix. Deterministic gain + limiter here; the master does 2-pass loudnorm.
  fc += `${voLab}highpass=f=80,` +
    `equalizer=f=3000:width_type=o:width=1.5:g=1.5,` +   // gentle presence only
    `acompressor=threshold=-18dB:ratio=2:attack=8:release=180:makeup=2,` +
    `deesser=i=0.12,` +
    `volume=1dB,alimiter=level=false:limit=0.95[voa];`
  const amixLabels = ['[voa]']
  if (hasAudio(clip)) { fc += `[0:a]volume=${usingPlaceholder ? 0 : 0.14}[amb];`; amixLabels.push('[amb]') }
  for (let k = 0; k < sfxInputs.length; k++) {
    const s = sfxInputs[k], ms = Math.round(s.at * 1000)
    fc += `[${s.idx}:a]adelay=${ms}|${ms},volume=${s.vol}[sfx${k}];`
    amixLabels.push(`[sfx${k}]`)
  }
  // duration=longest (not first): dynamic loudnorm on [voa] confuses amix's "first"
  // length tracking and truncates the voice mid-line; longest + -t is correct.
  fc += `${amixLabels.join('')}amix=inputs=${amixLabels.length}:duration=longest:dropout_transition=0:normalize=0,apad[a]`

  run([...inputs, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-t', `${dur}`, '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '10M', '-bufsize', '20M', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out])
  return { out, usingPlaceholder }
}

const rendered = []
for (const scene of SCENES) rendered.push(await renderScene(scene))
const files = rendered.map(r => r.out)
const placeholders = SCENES.filter((s, i) => rendered[i].usingPlaceholder).map(s => s.clip)

// concat scenes
const list = path.join(work, 'list.txt')
await writeFile(list, files.map(f => `file '${f.replaceAll("'", "'\\''")}'`).join('\n'))
const voice = path.join(work, 'voice.mp4')
run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', voice])

const total = SCENES.reduce((s, x) => s + x.dur, 0)
const music = path.join(root, 'music', 'playground-fun.mp3')
const final = path.join(output, 'clankeep-youtube-ad-veo-30s.mp4')

// music bed under the whole thing
const pre = path.join(work, 'pre.mp4')
// music bed ducked UNDER the voice (sidechain): drops for speech, swells to fill the gaps
run(['-i', voice, '-stream_loop', '-1', '-i', music,
  '-filter_complex',
  `[1:a]volume=0.24,afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, total - 1.3)}:d=1.3[mraw];` +
  `[mraw][0:a]sidechaincompress=threshold=0.06:ratio=6:attack=5:release=280[mduck];` +
  `[0:a][mduck]amix=inputs=2:duration=first:normalize=0[a]`,
  '-map', '0:v', '-map', '[a]', '-t', `${total}`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', pre])

// 2-pass loudness normalization + true-peak limiter (YouTube-friendly)
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', pre, '-af', 'loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' })
const j = JSON.parse(probe.stderr.slice(probe.stderr.indexOf('{'), probe.stderr.lastIndexOf('}') + 1))
run(['-i', pre, '-af', `loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,alimiter=level=false:limit=0.9`,
  '-map', '0:v', '-map', '0:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final])

// poster + captions sidecar
run(['-ss', '11', '-i', final, '-frames:v', '1', '-q:v', '3', path.join(output, 'clankeep-youtube-ad-veo-poster.jpg')])
function srtTime(s) { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), sec = Math.floor(ms % 60000 / 1000), x = ms % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(x).padStart(3, '0')}` }
const campaign = JSON.parse(await readFile(path.join(root, 'campaign.json'), 'utf8'))
const adById = Object.fromEntries(campaign.ad.map(a => [a.id, a]))
const mp3dur = id => { const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', narration(id)], { encoding: 'utf8' }); return parseFloat(r.stdout) || 0 }
let sceneStart = 0, nSrt = 1
const srtLines = []
for (const scene of SCENES) {
  let off = 0
  for (const vid of scene.vo) { const d = mp3dur(vid); const start = sceneStart + off; const end = Math.min(sceneStart + scene.dur, start + d); off += d; srtLines.push(`${nSrt++}\n${srtTime(start)} --> ${srtTime(Math.max(start + 0.5, end - 0.05))}\n${adById[vid].text}\n`) }
  sceneStart += scene.dur
}
await writeFile(path.join(output, 'clankeep-youtube-ad-veo-30s.srt'), srtLines.join('\n'))

console.log(`Veo ad rendered → ${path.relative(process.cwd(), final)} (${total.toFixed(1)}s)`)
console.log(placeholders.length ? `PLACEHOLDER scenes: ${placeholders.join(', ')} — drop real clips in ai-scenes/veo/ and re-run.` : 'All scenes used real Veo clips.')
