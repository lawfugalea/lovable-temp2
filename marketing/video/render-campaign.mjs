import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('marketing/video')
const work = path.join(root, '.campaign-work')
const output = path.join(root, 'output')
const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
const bold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const campaign = JSON.parse(await readFile(path.join(root, 'campaign.json'), 'utf8'))

const run = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
const esc = value => value.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "’").replaceAll('%', '\\%')
const rawClip = id => path.join(root, 'clips', `${id}.webm`)
const clip = id => path.join(work, `${id}-clean.mp4`)
const narration = (format, id) => path.join(root, 'narration', format, `${id}.mp3`)
const still = id => path.join(root, 'ai-scenes', `${id}.png`)

function screenFilter(title, plan, accent = '0x0F766E') {
  const titleText = esc(title)
  const chip = esc(plan)
  return `scale=1920:1200:force_original_aspect_ratio=increase,crop=1920:1080,drawbox=x=0:y=0:w=iw:h=92:color=0x081A2A@0.90:t=fill,drawtext=fontfile=${bold}:text='${titleText}':x=58:y=27:fontsize=34:fontcolor=white,drawbox=x=1640:y=24:w=230:h=46:color=${accent}@0.95:t=fill,drawtext=fontfile=${bold}:text='${chip}':x=1670:y=34:fontsize=21:fontcolor=white` 
}

async function renderScene({ format, scene, source, type = 'video', title, plan, accent, zoom = 'in' }) {
  const out = path.join(work, `${format}-${scene.id}.mp4`)
  const duration = scene.duration
  const inputArgs = type === 'still' ? ['-loop', '1', '-i', source] : ['-stream_loop', '-1', '-i', source]
  let vf
  if (type === 'still') {
    const z = zoom === 'out' ? "if(lte(zoom,1.0),1.10,max(1.0,zoom-0.00045))" : "min(zoom+0.0005,1.10)"
    vf = `scale=2100:-2,zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30`
    if (title) vf += `,drawbox=x=0:y=0:w=iw:h=ih:color=0x061725@0.14:t=fill,drawtext=fontfile=${bold}:text='${esc(title)}':x=74:y=82:fontsize=64:fontcolor=white:shadowcolor=black@0.35:shadowx=3:shadowy=3`
  } else vf = screenFilter(title, plan, accent)
  run([...inputArgs, '-i', narration(format, scene.id), '-filter_complex', `[0:v]${vf},fps=30,format=yuv420p[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=7,apad=pad_dur=${duration}[a]`, '-map', '[v]', '-map', '[a]', '-t', `${duration}`, '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out])
  return out
}

async function concatScenes(format, files, duration) {
  const list = path.join(work, `${format}.txt`)
  await writeFile(list, files.map(file => `file '${file.replaceAll("'", "'\\''")}'`).join('\n'))
  const silent = path.join(work, `${format}-voice.mp4`)
  run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent])
  const final = path.join(output, format === 'ad' ? 'clankeep-youtube-ad-30s.mp4' : 'clankeep-website-walkthrough.mp4')
  const music = path.join(root, 'music', 'playground-fun.mp3')
  const sfx = path.join(root, 'sfx', 'success.wav')
  run(['-i', silent, '-stream_loop', '-1', '-i', music, '-i', sfx, '-filter_complex', `[1:a]volume=${format === 'ad' ? '0.12' : '0.075'},afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, duration - 1.2)}:d=1.2[m];[2:a]adelay=${format === 'ad' ? 28400 : 119000}|${format === 'ad' ? 28400 : 119000},apad[s];[0:a][m][s]amix=inputs=3:duration=first:dropout_transition=1,loudnorm=I=-14:TP=-1.2:LRA=9,alimiter=level=false:limit=0.85[a]`, '-map', '0:v', '-map', '[a]', '-t', `${duration}`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final])
}

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000); const h = Math.floor(ms / 3600000); const m = Math.floor(ms % 3600000 / 60000); const s = Math.floor(ms % 60000 / 1000); const x = ms % 1000
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(x).padStart(3,'0')}`
}
async function captions(format) {
  let at = 0
  const body = campaign[format].map((scene, index) => { const start = at; at += scene.duration; return `${index + 1}\n${srtTime(start)} --> ${srtTime(at - .12)}\n${scene.text}\n` }).join('\n')
  await writeFile(path.join(output, format === 'ad' ? 'clankeep-youtube-ad-30s.srt' : 'clankeep-website-walkthrough.srt'), body)
}

await rm(work, { recursive: true, force: true }); await mkdir(work, { recursive: true }); await mkdir(output, { recursive: true })

for (const id of ['overview','shopping','meals','chores','notes','medicine','finance','household','pricing']) {
  run(['-ss','3','-i',rawClip(id),'-vf','scale=1920:1200:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p','-an','-c:v','libx264','-preset','medium','-crf','19',clip(id)])
}

const montage = path.join(work, 'feature-montage.mp4')
run([
  '-stream_loop','-1','-i',clip('meals'), '-stream_loop','-1','-i',clip('chores'), '-stream_loop','-1','-i',clip('medicine'), '-stream_loop','-1','-i',clip('notes'),
  '-filter_complex', `[0:v]${screenFilter('Meal planning','FREE')},trim=duration=2.3,setpts=PTS-STARTPTS[v0];[1:v]${screenFilter('Chores','FREE')},trim=duration=2.3,setpts=PTS-STARTPTS[v1];[2:v]${screenFilter('Medicine timeline','FREE + FAMILY','0xF97360')},trim=duration=2.3,setpts=PTS-STARTPTS[v2];[3:v]${screenFilter('Shared notes','FREE')},trim=duration=2.3,setpts=PTS-STARTPTS[v3];[v0][v1][v2][v3]concat=n=4:v=1:a=0,fps=30,format=yuv420p[v]`,
  '-map','[v]','-an','-c:v','libx264','-preset','medium','-crf','19',montage,
])

const adSources = {
  hook: [still('family-chaos'), 'still', '5 apps and a group chat?', '', '', 'in'],
  mess: [still('family-chaos'), 'still', 'Wait — who gave the medicine?', '', '', 'out'],
  demo: [montage, 'video', 'Everyone on the same page', 'FREE + FAMILY', '0xF97360'],
  money: [clip('shopping'), 'video', 'Malta: your basket, priced', 'FAMILY', '0x2EE6C8'],
  calm: [still('family-calm'), 'still', 'One calm place.', '', '', 'in'],
  cta: [still('family-calm'), 'still', 'Start free — clankeep.com', '', '', 'out'],
}
const adFiles = []
for (const scene of campaign.ad) { const [source,type,title,plan,accent,zoom] = adSources[scene.id]; adFiles.push(await renderScene({ format:'ad',scene,source,type,title,plan,accent,zoom })) }
await concatScenes('ad', adFiles, 30); await captions('ad')

if (process.env.RENDER_WALKTHROUGH) {
const walkVisuals = {
  intro: [still('family-calm'),'still','Meet ClanKeep','','','in'],
  overview: [clip('overview'),'video','Today at a glance','FREE'],
  shopping: [clip('shopping'),'video','Shared shopping + Malta price comparison','FREE + FAMILY','0xF97360'],
  meals: [clip('meals'),'video','Meals and recipes','FREE + FAMILY'],
  chores: [clip('chores'),'video','Chores everyone can see','FREE'],
  notes: [clip('notes'),'video','Shared and private notes','FREE'],
  medicine: [clip('medicine'),'video','Medicine timeline and reminders','FREE + FAMILY','0xF97360'],
  finance: [clip('finance'),'video','Money plan, goals and AI coach','FAMILY','0xF97360'],
  household: [clip('household'),'video','Your household team','FREE'],
  pricing: [clip('pricing'),'video','Start Free. Upgrade when it helps.','FREE + FAMILY','0xF97360'],
  finish: [still('family-calm'),'still','Start free at clankeep.com','','','out'],
}
const walkFiles = []
for (const scene of campaign.walkthrough) { const [source,type,title,plan,accent,zoom] = walkVisuals[scene.id]; walkFiles.push(await renderScene({ format:'walkthrough',scene,source,type,title,plan,accent,zoom })) }
await concatScenes('walkthrough', walkFiles, campaign.walkthrough.reduce((sum, scene) => sum + scene.duration, 0)); await captions('walkthrough')
}
console.log('Campaign masters rendered.')
