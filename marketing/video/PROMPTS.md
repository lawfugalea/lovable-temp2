# Production prompts — ClanKeep "Pays for itself" 30s ad

Concept: relatable-tension hook → fast real-UI demo → money kicker (Malta basket, cheapest store) → calm resolve → CTA. Narration lines live in `campaign.json` (`ad` array, ids: hook, mess, demo, money, calm, cta).

> **Never put the ElevenLabs API key in this file.** It is passed at runtime as `ELEVENLABS_API_KEY`. Only the voice ID is recorded here.

---

## 1. ElevenLabs voice direction

**Voice:** "Sarah" — `voice_id EXAVITQu4vr4xnSDxMaL` (warm, conversational adult female, mid-range energy).
**Model:** `eleven_multilingual_v2`. **Settings:** stability 0.38 · similarity 0.78 · style 0.42 · speaker_boost on (already encoded in `generate-elevenlabs.mjs`).

Direction to the performer before recording:

> You are one busy parent talking to another who will get the joke instantly. Warm and real — never a radio announcer, never a support agent. Use natural contractions, small pace shifts and subtle emphasis. Lightly amused at the open, reassuring through the middle, quietly confident at the end.

Per-line delivery notes:

| id | line | delivery |
|----|------|----------|
| hook | "Running a home takes five apps, three group chats, and a miracle." | Wry, punchy. Hit the rule-of-three rhythm — beat after "five apps," "three group chats," then land "and a miracle" with a dry half-smile. |
| mess | "Who's got the shopping list? Who gave the medicine? Nobody knows." | Two quick rhetorical jabs, rising; hard stop, then a flat, deadpan "Nobody knows." Genuine, not panicked. |
| demo | "ClanKeep puts it all in one place — your whole family, in sync, live." | Turn to calm confidence. Settle on "one place"; lift on "in sync," land "live." |
| money | "In Malta, it even finds the cheapest shop for your basket. It pays for itself." | Slight delight on "cheapest." "It pays for itself" — quiet, sure, a mic-drop. No hard sell. |
| calm | "Everything your home juggles — finally, in one calm place." | Soft, resolved; a little relief on "finally." Unhurried. |
| cta | "Start your household free — at ClanKeep dot com." | Direct and warm, confident downward close. Do not push. |

Tip: keep stability at 0.38 for human variation — do not raise it to smooth out every wobble.

---

## 2. Hero still image prompts (16:9)

Same cast in both, warm polished-3D animated-film look (soft global illumination, shallow depth of field, gentle daylight). **Cast lock:** Mum — light-brown skin, shoulder-length dark curly hair, gold hoop earrings, coral/salmon cardigan over cream top. Dad — taller, short dark curly hair, trimmed beard, teal-green button shirt. Daughter ~9 — curly ponytail with mustard scrunchie, mustard hoodie. Son ~3 — dark curls, cornflower-blue t-shirt. **Set lock:** bright Mediterranean kitchen, arched window with a hillside sea-town view, patterned teal tiled backsplash, pale-blue retro fridge, round stone-topped table. Same lens (~35mm), same warm morning light in both.

**`family-chaos.png` — before:**
> A warm polished-3D animated family scene, 16:9. A young family of four mid-morning chaos in a bright Mediterranean kitchen with an arched sea-view window and teal tiled backsplash. Mum in a coral cardigan reaches across a stone-topped table; dad in a teal shirt holds up a phone looking flustered-but-amused; a 9-year-old girl in a mustard hoodie packs a lunchbox; a toddler boy in a blue tee spills a cereal box, cereal mid-air. Sticky notes and a paper calendar cover the pale-blue fridge; grocery bags, a notebook and a second phone clutter the table. Soft morning light, shallow depth of field, gentle and funny, not stressful. No on-screen text.

**`family-calm.png` — after:**
> The same warm polished-3D animated family of four, same kitchen, same wardrobe and lens, 16:9. Now calm and together at the tidy stone-topped table: mum and dad relaxed with an arm around each other, the girl closing a neat lunchbox, the toddler happily holding a cereal box. One phone rests on the table showing a simple checklist with green ticks. The fridge is clear of clutter. Warm morning light, soft depth of field, content and unhurried. No on-screen text.

Midjourney variant (append to either): `warm 3D animated film still, Mediterranean kitchen, family of four, soft global illumination, shallow depth of field, morning light --ar 16:9 --style raw --no text, watermark, logos`

Keep generated screens abstract — composite the real ClanKeep UI in post whenever interface detail must be readable.

---

## 3. Kinetic captions (burned-in, sound-off legible)

One short caption per scene (already wired into `render-campaign.mjs` `adSources`). Big text top-left on stills; top-bar title + plan chip on UI scenes.

| scene | on-screen caption | plan chip |
|-------|-------------------|-----------|
| hook | 5 apps and a group chat? | — |
| mess | Wait — who gave the medicine? | — |
| demo | Everyone on the same page | FREE + FAMILY |
| money | Malta: your basket, priced | FAMILY (mint) |
| calm | One calm place. | — |
| cta | Start free — clankeep.com | — |

Full narration is also written to the sidecar `output/clankeep-youtube-ad-30s.srt` for accessibility. Malta price comparison is regional — the money caption names Malta explicitly; keep it that way.

---

🎯 Target: ElevenLabs (voice) + text-to-image tool (DALL·E 3 / Midjourney / Sora-image) + on-screen captions.
💡 Optimized for first-try reuse: voice notes are per-line and settings-locked; image prompts lock cast/set/lens for continuity; captions are short enough to read muted in under 2s.

---

## 5. Veo 3 "bold cut" — AI motion scenes (30s, 16:9)

Bolder, cinematic alternative to the kinetic master. Four ~8s Veo 3 clips supply the
*emotional* motion; the real ClanKeep UI, captions, plan chips and CTA are composited
in post by `render-veo.mjs`, and the ElevenLabs `ad` narration (`campaign.json`) is
laid on top. Same "Pays for itself" spine.

**Workflow:** generate each scene in Google Flow / Gemini (Veo 3), keep the best take,
and save into `ai-scenes/veo/` as `01-hook.mp4`, `02-demo.mp4`, `03-money.mp4`,
`04-cta.mp4`. Then `node marketing/video/render-veo.mjs`. Any missing clip renders as a
labelled placeholder so the pipeline always completes.

### Character consistency (IMPORTANT — the text cast-lock is not enough)
Each scene is a separate Veo generation, so the text "cast lock" alone will NOT keep the
family looking the same — faces/hair/clothes drift between clips. Anchor every scene to
the same reference image instead:

1. **Ingredients to Video (primary):** in Flow, use *Ingredients to Video* and add
   `ai-scenes/family-chaos.png` (or `family-calm.png`) as the **character reference** for
   ALL 4 scenes. Reuse the *same* image every time.
2. **Frames to Video (continuity):** generate Scene 1, take its **last frame**, and set it
   as the **start frame** of Scene 2; chain down the sequence. Or use Flow's **Extend** to
   continue a clip.
3. **Wording with a reference:** do NOT re-describe the cast's appearance (it fights the
   image). Refer to "the family from the reference image" and spend the prompt on action,
   camera and setting. When using a reference, treat the "Cast" lines in the shared block
   below as backup only.
4. **If drift remains:** favour shots where identity matters less — hands, the phone,
   over-the-shoulder, backs of heads.

**Watermark note (free Flow):** a ClanKeep brand bug is composited flush into the
bottom-right corner of every scene, which is where Flow puts its Veo watermark — so
**keep all key action out of the bottom-right corner** when prompting. (The invisible
SynthID mark remains; only the visible corner is covered.)

**Narration → clip map** (`campaign.json` `ad`, totals 30.0s): 01-hook = hook+mess
(9.0s) · 02-demo = demo (6.9s) · 03-money = money (6.4s) · 04-cta = calm+cta (7.7s).
Each clip is fitted to its length (freeze-frame hold if short, trim if long).

### Shared block — paste at the TOP of every scene (use WITH the reference image)
> Use the attached reference image as the family and the kitchen. Keep the SAME four
> people — same faces, hair and clothing — and the same set in every scene. Do not
> restyle, age or recast them.
> Style: hyper-real cinematic ad, warm Mediterranean daylight, ~35mm lens, punchy
> energetic timing — NOT cartoon.
> Format: 16:9, ~8 seconds, high energy, shallow depth of field.
> Audio: ambient + sound effects ONLY. No dialogue, no voiceover, no music.
> Keep key action AWAY from the bottom-right corner (reserved for the brand bug in post).
> Negative: no on-screen text or captions, no readable phone/app UI (keep screens
> soft/glowing/blank), no logos, no watermarks, no gibberish letters.
> (Cast backup — ONLY if you are not using a reference image: Mum — light-brown skin,
> shoulder-length dark curly hair, gold hoops, coral cardigan. Dad — taller, short dark
> curly hair, trimmed beard, teal shirt. Girl ~9 — mustard hoodie, ponytail. Boy ~3 —
> cornflower-blue tee.)

### Scene 1 — HOOK (0–8s) "the chaos"
> Open on the mum from the reference at a cluttered kitchen table; fast snap-zoom push-in.
> A swarm of dozens of glowing generic notification bubbles erupts and swirls around her
> head; she ducks and swats one away, half-laughing. Behind her the toddler tips a cereal
> box — cereal frozen mid-air — and the dad waves his phone helplessly. Slight handheld
> shake with the energy, then everything SNAPS to a sudden still on the final frame.
> Audio: rising phone dings, group-chat pings and kid clatter, cutting to a sudden hush.

### Scene 2 — TURN / DEMO (8–16s) "one place"
> Same family and kitchen from the reference. A hand firmly places one phone flat on the
> table; quick whip-pan. All the swirling notification bubbles get vacuumed into the phone
> in one satisfying motion and the air clears. The family leans in around the phone
> together, shoulders relaxing. Slow push-in on the clean, blank, softly glowing phone
> screen.
> Audio: a big satisfying whoosh, then one soft confident chime; calm room tone settles.

### Scene 3 — MONEY (16–24s) "it pays for itself"
> Dynamic macro close-up on the same stone table. A long supermarket receipt unrolls fast,
> then springs SHORTER by half. Euro coins stack beside it in quick stop-motion. A small
> stylised map of Malta rises and one store pin lights up warmly as the cheapest. The mum
> from the reference reacts, delighted, in soft focus behind. Energetic, playful.
> Audio: a tasteful cash-register cha-ching, light coin clinks, upbeat rising sting.

### Scene 4 — CALM + CTA (24–30s) "one calm place"
> Smooth slow pull-back from the family from the reference, now relaxed and together at a
> tidy table, warm golden light, the arched sea-view window glowing behind them. One phone
> rests face-up on the table; the toddler holds the cereal box upright, content. Composed,
> warm, unhurried. Leave clean empty space across the lower third and centre for a CTA
> lockup added in post.
> Audio: a warm resolving tone and one final gentle chime.

🎯 Target: Google Veo 3 (Gemini app / Google Flow) → composited by `render-veo.mjs`.
💡 Bold, muted-autoplay-friendly: each 8s scene is film-directed (camera move + gag +
SFX) with a locked cast/set so the four clips cut together; screens/text left blank so
the real ClanKeep UI, narration and CTA composite cleanly in post.
