#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$root/sfx"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=920:duration=0.08" -af "afade=t=out:st=0.02:d=0.06,volume=0.22" "$root/sfx/click.wav"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=660:duration=0.38" -af "asetrate=48000*1.7,aresample=48000,afade=t=out:st=0.12:d=0.1,volume=0.18" "$root/sfx/ping.wav"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "anoisesrc=color=pink:duration=0.32" -af "highpass=f=900,lowpass=f=6000,afade=t=in:d=0.04,afade=t=out:st=0.12:d=0.2,volume=0.08" "$root/sfx/whoosh.wav"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=523:duration=0.5" -f lavfi -i "sine=frequency=784:duration=0.5" -filter_complex "[0:a][1:a]amix=inputs=2,afade=t=in:d=0.03,afade=t=out:st=0.28:d=0.22,volume=0.16" "$root/sfx/success.wav"
