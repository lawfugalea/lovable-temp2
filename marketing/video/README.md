# ClanKeep campaign videos

This folder contains the reproducible pipeline for two 16:9 campaign masters:

- `output/clankeep-youtube-ad-30s.mp4` — 30-second animated YouTube ad
- `output/clankeep-website-walkthrough.mp4` — 2:02 product walkthrough
- matching `.srt` caption files in `output/`

Both videos are 1920×1080, 30 fps, H.264/AAC. The ad uses the polished 3D
`ai-scenes/family-chaos.png` and `ai-scenes/family-calm.png`; the walkthrough uses
real Playwright recordings of an ephemeral demo household. `campaign.json` is the
single source of truth for narration, timing and the Free/Family claims.

## Build

Use Node 22, as documented by the application README and Dockerfile. (The repo's
`.nvmrc` still says 20.11.1.)

1. Start the app on an isolated demo port:

   ```sh
   NEXTAUTH_URL=http://127.0.0.1:3090 \
   DEMO_MODE_ENABLED=true \
   NEXT_PUBLIC_DEMO_MODE_ENABLED=true \
   npm run dev -- -H 127.0.0.1 -p 3090
   ```

2. Record fresh, real product interactions. The script creates and seeds only a
   new 24-hour demo household.

   ```sh
   node marketing/video/record-interactions.mjs
   ```

3. Generate the final warm, conversational ElevenLabs performance:

   ```sh
   ELEVENLABS_API_KEY=... \
   ELEVENLABS_VOICE_ID=... \
   node marketing/video/generate-elevenlabs.mjs
   ```

   `ELEVENLABS_MODEL_ID` is optional and defaults to `eleven_multilingual_v2`.
   The script intentionally uses lower stability and moderate style so the read
   has more human variation. Direct the voice as friendly, lightly amused in the
   opening, reassuring in the product section, and confident—not announcer-like—
   on the CTA.

   For an offline timing preview only:

   ```sh
   marketing/video/generate-preview-narration.sh
   ```

4. Fetch the licensed music, make the original interface sound effects, and
   render both masters:

   ```sh
   marketing/video/download-music.sh
   marketing/video/synthesize-sfx.sh
   node marketing/video/render-campaign.mjs
   ```

## Creative and distribution notes

The ad cuts from playful family chaos to product interaction and a calm family
resolve. The feature montage changes every 2.3 seconds. The walkthrough labels
each section and shows whether it is Free, Family, or a combination; Malta price
comparison is explicitly presented as regional.

`music/LICENSE.txt` records the Mixkit source and license page for “Playground
Fun” by Ahjay Stelino. Retain that record and re-check the current license before
paid distribution. The interface sounds are synthesized locally and have no
third-party source. Confirm the selected ElevenLabs voice and plan permit the
intended commercial use before publishing.
