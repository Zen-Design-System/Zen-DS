# Voice components — usability and realism review (2026-10-13)

Scope: `VoiceRecorder`, `AiVoiceConversation` (Figma ❖ Voice 15081:1294) and `ChatVoice` (Chat/Bubble/Voice
15084:80205), judged against the products people already know: iOS Voice Memos, Google Recorder, WhatsApp / Telegram /
Messenger voice notes, ChatGPT Voice, Gemini Live, Siri, and the mute pattern of Google Meet, Zoom and FaceTime.
Asked by the user together with "make the Voice animation more realistic". Status: **fixed** = done in this change;
**proposal** = needs the user's approval (new API or behaviour); **designer** = needs a Figma decision.

## What real voice UIs do (the bar)

| Pattern | Seen in | What users expect |
| --- | --- | --- |
| Live waveform | Voice Memos, Google Recorder, WhatsApp, Telegram | New sound enters at one edge and scrolls; the speed matches the clock; paused, it freezes where it stopped |
| Recording light | Voice Memos, iOS status bar, camera apps | A red dot that glows on and off while the microphone records |
| Voice presence | ChatGPT Voice (orb / dots), Gemini Live (glow), Meet (speaking ring) | The shape breathes with the voice: syllables, gaps between words; the assistant's voice steadier than yours |
| Turn-taking | ChatGPT Voice, Gemini Live | The app ends your turn on silence (end-of-speech detection), thinks, speaks, then listens again by itself; you can interrupt |
| Thinking | ChatGPT (pulsing orb), Gemini (shimmer), Siri | A distinct state between your last word and the first spoken word (0.5–3 s of latency) |
| Mute | Meet, Zoom, FaceTime, ChatGPT | The muted button looks on (filled / red / slashed), the voice visual goes quiet, the UI says the mic is off |
| Discard | Voice Memos ("Delete Recording?"), Google Recorder, WhatsApp (slide to cancel) | Throwing a take away is confirmed, or is a deliberate gesture, or can be undone |
| Review before sending | Voice Memos, WhatsApp (lock → stop → play), Telegram | You can play the take back (and scrub) before you save or send it |
| Voice note playback | WhatsApp, Telegram, iMessage, Messenger | Played bars fill smoothly; the length is always visible; tap or drag on the waveform seeks; unheard notes are marked |

## VoiceRecorder

| # | Finding | Status |
| --- | --- | --- |
| R1 | While recording the waveform stood still (Figma's frame): nothing showed that sound was arriving. Now the sample take scrolls right to left at 7 bars a second — Figma's 56 bars are the 8-second window under it, so the bars travel with the clock — and the oldest bars fade out at the left edge. A take started from Ready begins empty and each bar enters at the right edge; Paused holds the take still where it stopped and Resume goes on from there. Reduced motion keeps Figma's still frame. | fixed |
| R2 | The Recording badge's dot was static. It now glows on and off (1.6 s), like a recorder's light; reduced motion keeps it steady. | fixed |
| R3 | The examples' clock counted 0.1 s ticks (hundredths stuck on x0, drifting from real time). It now runs from the real clock, so the hundredths run like a stopwatch's. | fixed (examples, playground) |
| R4 | Discard throws the take away at once, no confirmation and no undo. Every reference recorder protects this: confirm for a take longer than a few seconds, or an Undo toast. | proposal (guideline + examples) |
| R5 | No way to listen to the take before Finish (Voice Memos, WhatsApp and Telegram all allow it while paused). Needs a playback row in Paused: play/pause, a scrubbable waveform. | proposal + designer |
| R6 | Silence is not called out. Real recorders warn "No sound detected — check your microphone". Today `guidance` can carry it; the guideline should say when to use it. | proposal (guideline) |
| R7 | A real app must push its own `levels` at a steady rate to look like the sample. A small helper (`useVoiceLevels(stream)` on an AnalyserNode, 7 levels a second) would give every app the same motion. | proposal (new API) |
| R8 | Discard · Pause/Resume · Finish with the stop square as Finish matches Voice Memos; the time is a `role="timer"` that does not chatter. | ok |

## AiVoiceConversation

| # | Finding | Status |
| --- | --- | --- |
| A1 | The voice signal's bars stood still while listening and responding. They now move like a voice: the circle carries the loudness (your voice irregular, about four syllables a second with gaps between words and a breath; the assistant's steadier with one dip between sentences), each bar adds its own drift so they move together like a voice, not an equaliser, and the circle's halo swells with the voice (Meet's speaking ring, ChatGPT's orb). Bars keep round ends (clip-path, no layout per frame). Reduced motion keeps Figma's bars. | fixed |
| A2 | Muted while listening, the UI still said "Speak naturally…" and "Microphone connected", and the signal kept moving; the Mute toggle had no visible on state (only `aria-pressed`). Now the signal rests as dots, the guidance says "Your microphone is muted. Unmute to keep talking.", the note "Microphone muted", and Mute shows the button's Pressed look. | fixed (2 new label keys, en + vi) |
| A3 | The example's answer appeared all at once and the conversation stayed in Responding for ever. It now streams the answer at speaking pace and hands the turn back (Listening) when it finishes; muted, the live transcript stops. | fixed (examples) |
| A4 | No Thinking state between Done speaking and the first spoken word, so "Here's what I found" shows before anything is found. Every reference has one (a pulsing or shimmering presence). Needs `state="thinking"` and its Figma variant. | proposal + designer |
| A5 | "Done speaking" is the only way to end your turn. Real voice modes end it on silence and let you interrupt by speaking; the button stays as the manual fallback. The API already allows it (the app sets `state`); the guideline should say so. | proposal (guideline) |
| A6 | The Responding heading "Here's what I found" fits answers to questions, not actions or small talk ("Done. The review is at 11 now"). A neutral default ("Zen is speaking") or no heading while speaking would fit every turn. | designer (copy) |
| A7 | Muted uses the tertiary Pressed look; Meet and Zoom use a stronger, negative treatment. Is Pressed enough, or should Mute-on be Danger/Subtle? | designer |
| A8 | No error state for a dropped connection or a turn it could not hear ("I didn't catch that"). `heading`/`guidance` can carry it today. | proposal (guideline) |

## ChatVoice

| # | Finding | Status |
| --- | --- | --- |
| C1 | Played bars switched from 30 % to full at once. They now fade in as playback reaches them (Motion/Duration/Base, linear; a fade, so it stays under reduced motion). | fixed |
| C2 | The Social bubble shows no length at all (Business shows it). WhatsApp, Telegram and Messenger always show it and count it during playback. | designer |
| C3 | The waveform cannot seek. Tap/drag to seek is standard (a slider for assistive tech, ←/→ steps). Needs `onSeek`. | proposal (new API) |
| C4 | No unheard marker on a voice note you have not played (WhatsApp's blue microphone, Telegram's dot). | designer |
| C5 | Speed 1× → 1.5× → 2× matches WhatsApp and Telegram. | ok |

## How the motion is built (for reviewers)

- Everything moves in `voice.css`, inside `@media (prefers-reduced-motion: no-preference)`; the component adds the moving
  parts only when motion is allowed (`useMotionAllowed`), so reduced motion, the tests and the audits see Figma's DOM.
- Recorder: `SAMPLE_LOOP` = Figma's 56 bars + 104 seeded speech bars (23 s, ends quiet, so the loop has no seam), drawn
  twice on a track that moves one copy per `frames ÷ 7` seconds. A new take reveals itself with a mask that moves at the
  same speed (`--zen-voice-reveal`, registered).
- Conversation: registered `--zen-voice-energy` (the circle, inherited) × `--zen-voice-band` (each bar) × Figma's height,
  shown through `clip-path: inset(… round)` on a fixed 72px box; the halo is a `0 0 0` ring scaled by Motion/Movement.
- Stopped animations (Studio's HTML export) rest on Figma's frame: the reveal's initial value is fully open, the halo is
  0 (`--zen-voice-moving` is 1 only inside the keyframes).
- Your own `levels` are drawn as given; nothing is animated over them.
