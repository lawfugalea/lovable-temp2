#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$root/narration/ad" "$root/narration/walkthrough"
if ! command -v edge-tts >/dev/null 2>&1; then
  command -v uv >/dev/null 2>&1 && uv tool install edge-tts || { echo 'edge-tts is required' >&2; exit 1; }
fi
node - "$root/campaign.json" "$root/narration" <<'NODE'
const fs = require('fs')
const { spawnSync } = require('child_process')
const [campaignPath, out] = process.argv.slice(2)
const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'))
for (const [format, scenes] of Object.entries(campaign)) {
  for (const scene of scenes) {
    const file = `${out}/${format}/${scene.id}.mp3`
    const result = spawnSync('edge-tts', ['--voice', 'en-US-AriaNeural', '--rate=+8%', '--pitch=+2Hz', '--text', scene.text, '--write-media', file], { stdio: 'inherit' })
    if (result.status) process.exit(result.status)
  }
}
NODE
