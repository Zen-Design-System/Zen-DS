# AI UI — the live composer's layout and interaction (study, 2026-10-15)

The user's ask (2026-10-15): "tôi muốn các thao tác nó sẽ realtime như vậy [ShapeShift UI]. Nhưng cách bố trí UI và
interaction của chúng ta chưa đẹp và hợp lý. Bạn nghiên cứu thử nhé", then "các form nên bỏ vô card cho dễ nhìn".
This is the study: what the reference does, what ours does today and why it reads wrong, the principles, a proposed
layout with its states, what Zen has for it and what needs Figma, and a plan by tier. Nothing here is built unless the
user approves it; the one thing applied right away is the Card around composed forms (P1-a below).

Reference material: two ShapeShift screenshots the user shared (the site, `shapeshiftui.vercel.app`, is refused by the
sandbox's network policy even after the user allowed it, so the live page was not driven). Ours: the platform page
Patterns › AI UI, examples "Compose from a prompt" and "Composed while typing" (`src/platform/examples/pages/ai-ui.tsx`).

## 1. What ShapeShift does (from the screenshots)

One surface, one field, nothing else on the screen.

| Moment | What the card shows |
| --- | --- |
| Typing "buy a coffee" (guess) | Under the field, faded: a type row (calendar icon · "Event"), the title "Buy a coffee" pulled from the sentence, the empty slots as dashed chips "+ Add date" "+ Add time" "+ Add place" "+ Add people", and a hint "Tab to keep as event". |
| Typing "Remind me to pay" (confident) | Solid: type row (bell · "Reminder"), title "Pay", a filled slot chip "Anytime" at the right, hints "Esc to clear", and the primary action "Add reminder ↵" at the right. The recognised word "pay" is underlined inside the field. |

What makes it feel realtime and right:

1. **One object.** The field and its preview share one card with one border; the preview grows the card downward.
   The eye never travels: the answer is 24 px under the caret.
2. **A guess looks like a guess.** The whole preview is faded while the type is only likely; it turns solid when sure
   or kept with Tab. Empty slots are visibly empty (dashed "+ Add …"), filled slots are chips with the value.
3. **Nothing is said twice.** No sentence ("Here is the form…"), no percentages, no status line: the type row says
   what it thinks, the chips say what it heard, the footer says what the keys do.
4. **The keyboard is the UI.** Tab keeps the type, Esc clears, Enter runs the one primary action, and the hints sit
   where the eye already is (card footer), as keycaps.
5. **Quiet motion.** The card's height follows the content; content fades between types; nothing jumps.

## 2. What ours does today, and why it reads as "chưa đẹp, chưa hợp lý"

The example "Composed while typing" (390 and 1512 px contact sheets, 2026-10-15):

```
[ AiChatField ..................................... ↑ ]
Tab  to keep as booking and fill it in   Esc  to clear   Enter  to schedule
booking: ready (95%) · "Design review with the banking team" · 10/16/2026 · 16:00
┌ AiChatThread ─────────────────────────────────────────┐
│ Here is the form. Pick the project, a date and a time, │
│ and I'll schedule it.                                   │
│ Design review with the banking team                     │
│ Project [            v]                                 │
│ Date    [10/16/2026   ]                                 │
│ (09:00) (10:00) (14:00) (16:00●)                        │
│                         ( Cancel ) [ Schedule ]         │
└─────────────────────────────────────────────────────────┘
```

Findings, each at its owner:

| # | Finding | Why it hurts | Owner |
| --- | --- | --- | --- |
| F1 | Three separate things sit between the field and the form: a hints row, a debug status line (intent, percentage, slots), then a chat thread. | The preview is ~140 px below the caret; the status line is engineering output, not UI. | demo |
| F2 | The preview renders as an AI chat answer: a sentence ("Here is the form. Pick…") above a heading that says the same thing. | Said twice; the prose belongs to the sent answer, not to a live guess. | demo (composer copy) |
| F3 | The form floats on the page background with no surface (the user's screenshot). | A form with five controls has no edge; it reads as loose widgets. | demo: Card (done, P1-a) |
| F4 | A guess and a confirmed intent look identical. | Nothing tells the person "this is my guess, keep typing or press Tab". | Figma: a tentative state (BACKLOG) |
| F5 | Empty slots are empty inputs (Project select blank, Date placeholder). | ShapeShift's "+ Add date" says "I did not hear a date" in two words; a blank DateField says nothing. | Figma: dashed add-chip (BACKLOG) |
| F6 | Hints are Tags in a row above the status line, far from the actions they describe. | Keycaps belong in the footer next to the primary action (Enter) and the field (Esc). | demo; Kbd (BACKLOG) |
| F7 | The card's height jumps when the preview appears or switches intent. | Motion tokens exist (`--zen-motion-*`) but the preview has no height or crossfade transition. | demo / `.px-ai-ui` CSS |
| F8 | In the "Compose from a prompt" example the composed form sits in the thread with Cancel / Schedule, and the user cannot tell whether Enter in the field sends a new prompt or schedules. | Two primary actions compete (Send in the field, Schedule in the form). | pattern decision (§3) |
| F9 | Phone: the field is above the preview, so the keyboard covers nothing but the preview pushes the thread; the form's two buttons wrap under the chips. | On a phone the preview must sit above the field (keyboard at the bottom), as reply previews do. | demo (phone frame) |

## 3. Principles for Zen's version

1. **One object: the composer card.** The field is the card's header, the preview its body, the hints and the primary
   action its footer. In a chat, the card is the composer (it docks at the bottom, above the keyboard on a phone); when
   the person sends or runs the primary action, the result lands in the thread as a message and the card collapses back
   to a field. ShapeShift's quick-capture and the handoff's conversation become one thing.
2. **Three states, three looks.** Idle (a field), guessing (the template, tentative), confident (solid, with the primary
   action). Tab turns guessing into confident; Enter runs the action; Esc clears.
3. **Say it once.** No sentence above a preview, no percentages. The type row names the intent; the slot chips show what
   was heard; the footer shows the keys. The AI's sentence appears only on a sent answer in the thread.
4. **Slots before fields.** While typing, show the slots as chips (filled: "Tomorrow", "16:00", "Gia"; empty: "+ Add
   date"); the full Zen form (SelectField, DateField, ChipGroup) opens when the person clicks a chip, presses Tab into
   the card, or when the model composes something the template does not cover. The template stays small, the real UI
   stays real.
5. **Quiet motion from tokens.** Height follows content with `--zen-motion-duration-base` and `--zen-motion-ease-standard`;
   a type switch crossfades (`duration-fast`); reduced motion keeps the fades only (`--zen-motion-movement` = 0).
6. **The keyboard never traps.** Tab keeps the guess and moves on (the behaviour gate's rule, APG); Esc clears only while
   there is something to clear; Enter is the primary action only while one is on screen.

## 4. The proposed layout

Desktop, guessing (after "schedule a design review with the banking team tomorrow at"):

```
┌──────────────────────────────────────────────────────────────────────┐
│ schedule a design review with the banking team tomorrow at|          │  ← AiChatField, as today
│                                                                      │
│ ▢ Booking · likely                                   (tentative)     │  ← type row: icon + intent, muted
│ Design review with the banking team                                  │  ← title slot (Heading/4)
│ [Tomorrow] [+ Add time] [Banking team?] [+ Add place]                │  ← slot chips: filled · empty (dashed)
│                                                                      │
│ Tab keep as booking   Esc clear                        Enter Schedule│  ← footer: keycaps left, primary right
└──────────────────────────────────────────────────────────────────────┘
```

Desktop, confident (after "…at 4 pm", or Tab):

```
┌──────────────────────────────────────────────────────────────────────┐
│ schedule a design review with the banking team tomorrow at 4 pm      │
│                                                                      │
│ ▣ Booking                                                            │  ← solid
│ Design review with the banking team                                  │
│ [Tomorrow ▾] [16:00 ▾] [Banking team ▾] [+ Add place]                │  ← a chip opens its control (DatePicker, slots)
│ Project  [ Online banking redesign           v ]                     │  ← a field the template needs and no slot gave
│                                                                      │
│ Esc clear                                   (Cancel)  [ Schedule ↵ ] │
└──────────────────────────────────────────────────────────────────────┘
```

Phone (390): the same card docked at the bottom, the preview **above** the field so the keyboard covers nothing:

```
│ ▣ Booking                          │
│ Design review with the banking …   │
│ [Tomorrow] [16:00] [+ Add place]   │
│ Project [                     v ]  │
│                 [ Schedule ↵ ]     │
│ ┌───────────────────────────────┐  │
│ │ schedule a design review …  ↑ │  │  ← field stays at the keyboard
│ └───────────────────────────────┘  │
```

Sent / run: the card collapses to the field; the thread gains the person's turn and the AI's answer (sentence + the
composed UI on a Card, as today's "Compose from a prompt" does after this change). Follow-ups ("make it accent", "4 pm")
keep editing that card in the thread, as today.

### States

| State | Trigger | Card body | Footer | Field |
| --- | --- | --- | --- | --- |
| idle | empty or < 3 chars | nothing | nothing | placeholder |
| guessing | classifier ≥ 0.6, not pinned | type row (muted) · title · slot chips, all tentative | Tab keep · Esc clear · Enter compose | typing |
| composing | compose in flight | same, with the type row's dot pulsing (no spinner) | same | typing |
| confident | pinned (Tab), or the model answered, or confidence ≥ 0.85 | solid; chips open their controls; template fields | Esc clear · Cancel · Enter = primary | typing or in the card |
| sent | Enter with a primary action, or Send | collapses to the field; the result lands in the thread | – | cleared |
| failed | the model call failed | the template stays, one line under the type row with the reason | same as guessing | typing |

Switch rules stay as built (`switchMargin`, `stickMs`; an unsure guess never clears what is shown).

## 5. What Zen already has, what needs Figma

| Piece | Zen today | Needs |
| --- | --- | --- |
| The card surface | `Card` (shadow / border / flat) | nothing; `Card` around the composed UI is applied (P1-a) |
| The field | `AiChatField` with `value` / `onValueChange` / `onAccept` / `onClear` | nothing |
| Type row | `Icon` + `Text`; a `Segmented` or `Menu` to change the type by hand | a muted look for "likely" (tentative) |
| Slot chips | `Chip` (`selected`, `dropdown`, `state="placeholder"` recolours the label) | the dashed "+ Add …" variant and the tentative look (Figma) |
| Slot controls | `DatePicker`, `ChipGroup`, `SelectField`, `AutocompleteField` for people | nothing |
| Footer keycaps | `Tag` as a stand-in | a `Kbd` component (Figma, XS) |
| Primary action | `Button` primary; Enter via `primaryActionOf` | nothing |
| Motion | `--zen-motion-*` tokens; `prefers-reduced-motion` convention | a height transition on the card body (CSS, `.px-ai-ui` first, then the pattern's own CSS) |
| Tentative state | none; no opacity token | a Figma decision: a `tentative` state on the preview surface, or an opacity token (BACKLOG) |
| Inline highlight of recognised spans | `extractSlots` returns `spans`; the field is a plain textarea | an overlay in `AiChatField` (Figma, tier M; BACKLOG) |

## 6. Plan (nothing started without the user's approval, except P1-a which the user asked for)

| Step | Scope | Tier | Figma? |
| --- | --- | --- | --- |
| **P1-a** | Composed UIs with bound controls render on a `Card` (host-side; the model never adds it). Applied to the three render sites on the page. | S | no |
| **P1-b** | Re-layout the live example as the composer card: field on top, type row, template, footer with keycaps and the primary action; drop the status line; crossfade from the motion tokens. **Done 2026-10-15 (demo).** Two deviations the gate forced: the field stays outside the card (a 32 px pill inside a 16 px card is not concentric, rhythm rule) and the card sits right under it; no height transition (clipping the body hid the DatePicker popover from the focus audit; a settled-state mechanism is for the pattern's own CSS). The phone variant (preview above the field) is still open. | M | no |
| **P1-c** | Slot chips: filled values as `Chip` with `dropdown`; empty slots as `Chip` `state="placeholder"` "+ Add date" until the dashed variant exists. **Done 2026-10-15 (demo):** the chips are the guess; once the form shows (sure, or a chip opened) it carries the date and the time, so those two chips step aside; the slots the form has no field for (people, place) stay as chips above it. "Sure" is Tab or the composer's answer only: the keyword classifier's confidence reaches 0.95 on any long sentence, so a threshold would make every guess look sure (open question 3, answered). | S | no |
| **P1-d** | The chat screen around the composer, without Figma: a bar (title, who answers, the panel's button), the conversation scrolling under a docked `AiChatField` in Liquid Glass on desktop and phone, suggested prompts after the last answer, bubbles fading in from the motion tokens, the shared state / events as a "What Zen AI sees" panel over the screen's edge (DescriptionList + list) instead of a JSON column; while the AI works, a frosted glass sphere after the Dribbble shot "Sphere AI Assistant" (a pink pool, a lavender haze, an aurora band of cyan drifting inside; Support tokens) in the bubble that waits for the answer and on the composer card's type row, the effect the user meant by "gradient animation" (thinking / composing); a page tint tried first was dropped at the user's word ("bỏ nền gradient đi"), and a gradient ring around the field read as an ugly outline ("thử 1 cục tròn như Siri"), then a conic Siri-style orb gave way to the Dribbble sphere the user pointed at. **Done 2026-10-15 (demo).** No JS effect library: CSS keyframes, the Liquid Glass hook the field already has. An "AI glow" gradient of its own waits for tokens (P2). | S–M | no |
| **P1-e** | The composer on a phone (§4 "Phone (390)", F9): the card rises **above** the docked field so a keyboard covers nothing and the preview pushes the greeting up; the screen follows the field as the card grows; the footer trades the keys (no Tab / Esc on a phone) for a "Keep as …" button beside Cancel / the primary action. **Done 2026-10-15 (demo):** example "Composed while typing, on a phone" (`LiveTypingPhone`, `LiveTypingExample placement="above"`). | S | no |
| **P1-f** | Listening and free text (the user: "type gì cũng được", "real time listening"): the card appears on the first keystroke as "Zen AI · listening", the sphere beats on each key (Web Animations on `scale`, step × `--zen-motion-movement`, duration from the motion tokens); a sentence the keyword classifier does not know becomes a "free" intent after a few words, at the lowest confidence the composer accepts, so the composer gets it as it is (the model when configured; without one the demo says what it can build). Slot chips stop being buttons once the form is shown (the gate's dead-click warning). **Done 2026-10-15 (demo).** | S | no |
| **P2** | Figma: tentative state, dashed add-chip, `Kbd`, and the "AI/Composer-Preview" pattern itself (so the demo is a real pattern, not a one-off). Then code them. | M | yes |
| **P3** | The underlined span in the field. | M | yes |
| **P4** | Promote the composer card from the demo into the library (`AiComposer`?) once P2 lands and the product confirms the pattern. | L | yes |

Open questions for the user: (1) does the composer card replace the chat composer in Zen AI, or sit above it as a
preview (the wireframes assume it is the composer)? (2) chips-first or the full form first while guessing (the
proposal says chips first, the form on demand)? (3) is "confident" reached by confidence alone (≥ 0.85) or only by Tab
or the model's answer?
