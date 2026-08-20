import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const key = process.env.ELEVENLABS_API_KEY
if (!key) throw new Error('ELEVENLABS_API_KEY is required')
const voiceId = process.env.ELEVENLABS_VOICE_ID
if (!voiceId) throw new Error('ELEVENLABS_VOICE_ID is required (choose the approved warm, conversational voice)')

const root = path.resolve('marketing/video')
const campaign = JSON.parse(await readFile(path.join(root, 'campaign.json'), 'utf8'))
const only = process.env.ELEVENLABS_FORMATS ? new Set(process.env.ELEVENLABS_FORMATS.split(',').map(s => s.trim())) : null
for (const [format, scenes] of Object.entries(campaign)) {
  if (only && !only.has(format)) continue
  const dir = path.join(root, 'narration', format)
  await mkdir(dir, { recursive: true })
  for (const scene of scenes) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: scene.text,
        model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.8, use_speaker_boost: true }
      })
    })
    if (!response.ok) throw new Error(`${scene.id}: ElevenLabs returned ${response.status}: ${await response.text()}`)
    await writeFile(path.join(dir, `${scene.id}.mp3`), Buffer.from(await response.arrayBuffer()))
    console.log(`generated ${format}/${scene.id}.mp3`)
  }
}
