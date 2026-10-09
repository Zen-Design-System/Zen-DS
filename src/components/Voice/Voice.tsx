import { useId, type ReactNode } from "react";
import { Badge } from "../Badge";
import { IconButton } from "../Button";
import { Icon } from "../Icon";
import type { IconName } from "../../icons/generated/names";
import { typographyStyles } from "../../tokens/typography.generated";
import { AiChatBubble } from "../AiChat";
import { useZenLabels } from "../_shared/zen-context";
import "./voice.css";

/*
 * Figma ❖ Voice (15081:1294): purpose-built voice components made of Zen parts, typography styles and semantic
 * variables. Both are 400 wide in Figma: Spacing/Padding/XLarge around, Spacing/Gap/Medium between their rows, a
 * transparent frame (put them on a Card or a Surface), and three Voice actions — a Large Tertiary Button/Icon-Main
 * either side of an XLarge Primary one, each over its Label/Small/Medium name (Spacing/Gap/XSmall).
 */

/** A waveform: one bar per level (0–1), 3px wide, 2px apart, Corner-Radius/Rounded, centred in its box. */
function Waveform({ levels, className }: { levels: readonly number[]; className: string }) {
  return (
    <span className={`zen-voice-wave ${className}`} aria-hidden="true">
      {levels.map((level, index) => (
        // zen-allow-inline-style: each bar's height is its sound level (a data value, not a token).
        <span key={index} className="zen-voice-wave__bar" style={{ height: `${Math.max(0, Math.min(1, level)) * 100}%` }} />
      ))}
    </span>
  );
}

/** One Voice action: an icon button over its visible name (the button's accessible name; the text is not read twice). */
function VoiceAction({ icon, label, main = false, disabled = false, pressed, onClick }: { icon: IconName; label: string; main?: boolean; disabled?: boolean; pressed?: boolean; onClick?: () => void }) {
  return (
    <span className="zen-voice-action" data-main={main || undefined} data-disabled={disabled || undefined}>
      {/* zen-allow-no-tooltip: the action's name is printed under it (Figma's Voice action), so a tooltip would repeat it */}
      <IconButton
        appearance="main"
        level={main ? "primary" : "tertiary"}
        size={main ? "xl" : "lg"}
        icon={icon}
        aria-label={label}
        aria-pressed={pressed}
        tooltip={false}
        disabled={disabled}
        onClick={onClick}
      />
      <span className={`zen-voice-action__label ${typographyStyles["Label/Small/Medium"]}`} aria-hidden="true">{label}</span>
    </span>
  );
}

/* ── Voice Recorder ─────────────────────────────────────────────────────────────────────────────── */

export type VoiceRecorderState = "ready" | "recording" | "paused";

/** Figma's waveform of a take in progress: 56 levels. */
const SAMPLE_TAKE = [8, 16, 12, 25, 18, 32, 44, 28, 18, 38, 54, 40, 26, 14, 22, 46, 62, 48, 34, 20, 12, 30, 48, 36, 20, 14, 28, 40, 56, 68, 50, 34, 22, 42, 58, 44, 32, 18, 26, 48, 64, 42, 24, 16, 36, 52, 38, 22, 12, 20, 36, 26, 16, 10, 18, 8].map((px) => px / 80);
const FLAT_TAKE = Array.from({ length: 56 }, () => 4 / 80);

export type VoiceRecorderProps = {
  /** Figma State: Ready (nothing recorded yet), Recording, Paused. Your recorder drives it. */
  state?: VoiceRecorderState;
  /** The header's name of the take. Default: the locale's "New recording". */
  title?: ReactNode;
  /** The take's length so far ("00:24.18"), Heading/Subheading. */
  elapsed?: string;
  /** The waveform window's start and end times under it ("00:16", "00:24"). */
  start?: string;
  end?: string;
  /** The recent sound levels, 0–1 each, oldest first (Figma draws 56). Unset: Figma's sample take; Ready: a flat line. */
  levels?: readonly number[];
  /** The line under the waveform. Default: what the state means ("Capturing audio from your microphone."). */
  guidance?: ReactNode;
  /** The footer: the input device ("Built-in microphone") and the format ("48 kHz · Mono"). */
  input?: ReactNode;
  format?: ReactNode;
  /** Record (Ready), Pause (Recording) and Resume (Paused): the main action. Without the handler for the current state it
   *  is off, e.g. leave out `onResume` once a take reaches its length limit. */
  onRecord?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  /** Finish the take (Recording, Paused). */
  onFinish?: () => void;
  /** Throw the take away (Recording, Paused). */
  onDiscard?: () => void;
  className?: string;
};

/**
 * Figma Voice Recorder (15084:79711): a header (Body/Base/Medium name + a Small Subtle Badge: Neutral Ready / Paused,
 * Red Recording with its dot), the audio monitor (Background/Surface/Alt, Corner-Radius/Base, Spacing/Padding/Medium:
 * the elapsed time in Heading/Subheading, an 80px waveform — Content/Neutral/Strongest while recording, Neutral/Light
 * paused, a flat Border/Neutral/Subtle line when ready — and its start / end times in Caption/Regular Neutral/Light),
 * the guidance (Body/Small/Regular Neutral/Base), the transport (Discard · Record/Pause/Resume · Finish; Discard and
 * Finish disabled until there is a take), a Border/Neutral/Pale divider and the input details.
 */
export function VoiceRecorder({ state = "ready", title, elapsed = "00:00.00", start = "00:00", end = "00:00", levels, guidance, input, format, onRecord, onPause, onResume, onFinish, onDiscard, className }: VoiceRecorderProps) {
  const t = useZenLabels();
  const titleId = useId();
  const ready = state === "ready";
  const wave = ready ? FLAT_TAKE : levels ?? SAMPLE_TAKE;
  const main = state === "recording"
    ? { icon: "icon-pause-solid" as const, label: t.voicePause, onClick: onPause }
    : state === "paused"
      ? { icon: "icon-microphone-solid" as const, label: t.voiceResume, onClick: onResume }
      : { icon: "icon-microphone-solid" as const, label: t.voiceRecord, onClick: onRecord };
  const said = guidance ?? (state === "recording" ? t.voiceRecordingGuidance : state === "paused" ? t.voicePausedGuidance : t.voiceReadyGuidance);
  return (
    <div className={["zen-voice", "zen-voice-recorder", className].filter(Boolean).join(" ")} role="group" aria-labelledby={titleId} data-state={state}>
      <div className="zen-voice__header">
        <span id={titleId} className={`zen-voice__title ${typographyStyles["Body/Base/Medium"]}`}>{title ?? t.voiceNewRecording}</span>
        {state === "recording"
          ? <Badge size="sm" theme="red" background="subtle">{t.voiceRecording}</Badge>
          : <Badge size="sm" theme="neutral" background="subtle" leadingIcon={false}>{state === "paused" ? t.voicePaused : t.voiceReady}</Badge>}
      </div>
      <div className="zen-voice-recorder__monitor">
        <span className={`zen-voice-recorder__time ${typographyStyles["Heading/Subheading"]}`} role="timer" aria-live="off">{elapsed}</span>
        <Waveform levels={wave} className="zen-voice-recorder__wave" />
        <span className={`zen-voice-recorder__timeline ${typographyStyles["Caption/Regular"]}`} aria-hidden="true">
          <span>{start}</span>
          <span>{end}</span>
        </span>
      </div>
      <p className={`zen-voice__guidance ${typographyStyles["Body/Small/Regular"]}`} aria-live="polite">{said}</p>
      <div className="zen-voice__actions">
        <VoiceAction icon="icon-x-circle-solid" label={t.voiceDiscard} disabled={ready} onClick={onDiscard} />
        {/* Without its handler the main action is off (e.g. no Resume once a take reaches its limit). */}
        <VoiceAction main icon={main.icon} label={main.label} disabled={!main.onClick} onClick={main.onClick} />
        <VoiceAction icon="icon-stop-solid" label={t.voiceFinish} disabled={ready} onClick={onFinish} />
      </div>
      {input || format ? (
        <div className={`zen-voice__details ${typographyStyles["Caption/Regular"]}`}>
          <span>{input}</span>
          <span>{format}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ── AI Voice Conversation ─────────────────────────────────────────────────────────────────────── */

export type AiVoiceState = "ready" | "listening" | "responding";

/** Figma's voice signal bars (px of the 96px circle): 5 while listening, 7 while responding. */
const LISTENING_LEVELS = [12, 28, 44, 32, 16];
const RESPONDING_LEVELS = [22, 40, 28, 52, 34, 44, 20];

export type AiVoiceConversationProps = {
  /** Figma State: Ready (the microphone is off), Listening (you talk), Responding (the assistant answers). */
  state?: AiVoiceState;
  /** The assistant's name in the header. Default: the locale's "Zen voice". */
  name?: ReactNode;
  /** The status heading and its line (Heading/Subheading, Body/Small/Regular). Default: what the state means. */
  heading?: ReactNode;
  /** The status heading's level in the page outline (an `h3` by default; `2` straight under a screen's h1). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  guidance?: ReactNode;
  /** Who the transcript is from ("You · Live transcript", "Zen · Spoken response"); Ready: "Try saying". */
  speaker?: ReactNode;
  /** The transcript card's text (Figma AI/Chat-Bubble Side=AI): a suggestion when ready, what you say, what it says. */
  transcript?: ReactNode;
  /** The voice signal's bar levels while listening or responding, 0–1 each (Figma draws 5 and 7). */
  levels?: readonly number[];
  /** Mute (the left action, a toggle; off until the conversation starts). */
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  /** The main action: Start talking (Ready), Done speaking (Listening), Interrupt (Responding). */
  onStart?: () => void;
  onDone?: () => void;
  onInterrupt?: () => void;
  /** End the conversation (off while Ready). */
  onEnd?: () => void;
  /** The note under the actions (Caption/Regular Neutral/Light). Default: what the microphone is doing. */
  note?: ReactNode;
  className?: string;
};

/**
 * Figma AI Voice Conversation (15084:79715): the header (Body/Base/Medium name + a Small Subtle Badge with its dot:
 * Neutral Ready, Accent Listening / Responding), the 96px voice signal (Corner-Radius/Rounded: Background/Surface/Alt with
 * the microphone when ready, Background/Accent/Subtle with 4px Content/Accent/Light bars, Spacing/Gap/2XSmall apart),
 * the status (Heading/Subheading + Body/Small/Regular Neutral/Light), the transcript card (Background/Surface/Alt,
 * Corner-Radius/Base, Spacing/Padding/Small: the speaker in Label/Small/Medium Neutral/Light over an AI/Chat-Bubble),
 * the actions (Mute · Start talking / Done speaking / Interrupt · End) and the note.
 */
export function AiVoiceConversation({ state = "ready", name, heading, headingLevel = 3, guidance, speaker, transcript, levels, muted = false, onMutedChange, onStart, onDone, onInterrupt, onEnd, note, className }: AiVoiceConversationProps) {
  const t = useZenLabels();
  const nameId = useId();
  const ready = state === "ready";
  const bars = levels?.map((level) => level * 96) ?? (state === "responding" ? RESPONDING_LEVELS : LISTENING_LEVELS);
  const main = state === "listening"
    ? { icon: "icon-stop-solid" as const, label: t.voiceDoneSpeaking, onClick: onDone }
    : state === "responding"
      ? { icon: "icon-microphone-line" as const, label: t.voiceInterrupt, onClick: onInterrupt }
      : { icon: "icon-microphone-solid" as const, label: t.voiceStartTalking, onClick: onStart };
  const status = state === "listening" ? t.voiceListening : state === "responding" ? t.voiceResponding : t.voiceReady;
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <div className={["zen-voice", "zen-ai-voice", className].filter(Boolean).join(" ")} role="group" aria-labelledby={nameId} data-state={state}>
      <div className="zen-voice__header">
        <span id={nameId} className={`zen-voice__title ${typographyStyles["Body/Base/Medium"]}`}>{name ?? t.voiceAssistant}</span>
        <Badge size="sm" theme={ready ? "neutral" : "accent"} background="subtle">{status}</Badge>
      </div>
      <div className="zen-ai-voice__presence">
        <span className="zen-ai-voice__signal" aria-hidden="true">
          {ready ? <Icon name="icon-microphone-line" size="lg" decorative /> : bars.map((px, index) => (
            // zen-allow-inline-style: each bar's height is the live voice level (a data value, not a token).
            <span key={index} className="zen-ai-voice__level" style={{ height: `${Math.max(4, Math.min(96, px))}px` }} />
          ))}
        </span>
      </div>
      <div className="zen-ai-voice__status" aria-live="polite">
        <Heading className={`zen-ai-voice__heading ${typographyStyles["Heading/Subheading"]}`}>{heading ?? (state === "listening" ? t.voiceListeningHeading : state === "responding" ? t.voiceRespondingHeading : t.voiceReadyHeading)}</Heading>
        <span className={`zen-ai-voice__guidance ${typographyStyles["Body/Small/Regular"]}`}>{guidance ?? (state === "listening" ? t.voiceListeningGuidance : state === "responding" ? t.voiceRespondingGuidance : t.voiceReadyConversationGuidance)}</span>
      </div>
      {transcript ? (
        <div className="zen-ai-voice__context">
          <span className={`zen-ai-voice__speaker ${typographyStyles["Label/Small/Medium"]}`}>{speaker ?? (state === "listening" ? t.voiceYouLive : state === "responding" ? t.voiceAssistantSpoken : t.voiceTrySaying)}</span>
          <AiChatBubble side="ai">{transcript}</AiChatBubble>
        </div>
      ) : null}
      <div className="zen-voice__actions">
        <VoiceAction icon="icon-microphone-off-solid" label={t.voiceMute} pressed={ready ? undefined : muted} disabled={ready} onClick={() => onMutedChange?.(!muted)} />
        <VoiceAction main icon={main.icon} label={main.label} onClick={main.onClick} />
        <VoiceAction icon="icon-x-circle-solid" label={t.voiceEnd} disabled={ready} onClick={onEnd} />
      </div>
      <p className={`zen-voice__note ${typographyStyles["Caption/Regular"]}`}>{note ?? (ready ? t.voiceMicOffNote : t.voiceConnectedNote)}</p>
    </div>
  );
}
