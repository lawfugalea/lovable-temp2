#!/usr/bin/env bash
set -euo pipefail

video_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
narration_dir="$video_root/narration"
mkdir -p "$narration_dir/landscape" "$narration_dir/vertical"

if ! command -v edge-tts >/dev/null 2>&1; then
  if command -v uv >/dev/null 2>&1; then
    uv tool install edge-tts
  else
    echo 'edge-tts is required; install it with uv tool install edge-tts' >&2
    exit 1
  fi
fi

node - "$video_root/scenes.json" "$narration_dir" <<'NODE'
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const [scenesPath, outputRoot] = process.argv.slice(2)
const scenes = JSON.parse(fs.readFileSync(scenesPath, 'utf8'))

for (const format of ['landscape', 'vertical']) {
  for (const scene of scenes[format]) {
    const output = `${outputRoot}/${format}/${scene.id}.mp3`
    const result = spawnSync('edge-tts', [
      '--voice', 'en-US-AvaMultilingualNeural',
      '--rate=+6%',
      '--pitch=-1Hz',
      '--text', scene.narration,
      '--write-media', output,
    ], { stdio: 'inherit' })
    if (result.status !== 0) process.exit(result.status || 1)
  }
}
NODE
