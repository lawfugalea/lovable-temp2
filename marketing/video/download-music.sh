#!/usr/bin/env bash
set -euo pipefail

video_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$video_root/music"
curl -L --fail --silent --show-error \
  'https://assets.mixkit.co/music/12/12.mp3' \
  -o "$video_root/music/playground-fun.mp3"

