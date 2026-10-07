import { useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { IconButton } from "../Button";
import { Chip } from "../Chip";
import { Icon, type IconName } from "../Icon";
import { Tooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./ai-chat.css";
import "../Icon/core";

/** Figma AI/Chat-Field Style: Default (Input fill + Effect/Input) · Surface (Surface + Shadow/Bottom/Level-1) · Liquid Glass. */
export type AiChatFieldStyle = "default" | "surface" | "liquid-glass";

export interface AiChatFieldProps {
  onSubmit: (text: string) => void;
  /** Prompt placeholder, also the field's accessible name (the locale's "Ask me anything" by default). */
  placeholder?: string;
  fieldStyle?: AiChatFieldStyle;
  /** Figma Model: the model switch label (Body/Base/Medium + chevron) — open your model Popover from `onModelClick`. */
  model?: ReactNode;
  onModelClick?: () => void;
  /** Figma Leading-Actions (+): attachments or tools. */
  onAttach?: () => void;
  /** Figma trailing microphone (Icon-Flat). */
  onVoice?: () => void;
  /** While the reply streams, the primary button becomes Stop. */
  busy?: boolean;
  onStop?: () => void;
  disabled?: boolean;
  defaultValue?: string;
  className?: string;
}

/**
 * Figma AI/Chat-Field (12074:16888): radius 32, padding 12; one row (+ · prompt Body/Extra/Medium · model · mic · Primary
 * 40px) that becomes two rows for long prompts (State=Long-Typing). The Primary action is Voice (recording) when empty and
 * Send (arrow-up) once there is text. Enter sends, Shift+Enter adds a line. The whole field is the prompt's hit area: a
 * click or tap anywhere outside its buttons puts the caret in the prompt.
 */
export function AiChatField({ onSubmit, placeholder: placeholderProp, fieldStyle = "default", model, onModelClick, onAttach, onVoice, busy = false, onStop, disabled = false, defaultValue = "", className }: AiChatFieldProps) {
  const t = useZenLabels();
  const placeholder = placeholderProp ?? t.askAnything;
  const [text, setText] = useState(defaultValue);
  const typing = text.trim().length > 0;
  const long = text.length > 48 || text.includes("\n");
  const submit = (event?: FormEvent) => { event?.preventDefault(); if (!typing || busy) return; onSubmit(text.trim()); setText(""); };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } };
  // The whole field is the prompt's hit area: a click or tap on the padding, the placeholder or the gaps between the
  // controls types into the prompt (caret at the end); the buttons keep their own action. Keyboard users reach the
  // prompt with Tab as before.
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const onControl = (target: EventTarget) => target instanceof Element && Boolean(target.closest("button, a, input, select, textarea, [role='button']"));
  const keepCaret = (event: MouseEvent<HTMLFormElement>) => { if (!disabled && !onControl(event.target)) event.preventDefault(); };
  const focusPrompt = (event: MouseEvent<HTMLFormElement>) => {
    const input = inputRef.current;
    if (disabled || !input || onControl(event.target) || document.activeElement === input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  };
  const primary = busy
    ? <IconButton appearance="main" level="primary" size="md" aria-label={t.stopGenerating} onClick={onStop} icon={<Icon name="icon-stop-solid" />} />
    : typing
      ? <IconButton appearance="main" level="primary" size="md" type="submit" aria-label={t.send} disabled={disabled} icon={<Icon name="icon-arrow-up-line" />} />
      : <IconButton appearance="main" level="primary" size="md" aria-label={t.startVoiceMode} disabled={disabled} onClick={onVoice} icon={<Icon name="icon-recording-02-line" />} />;
  return (
    <form className={["zen-ai-field", className].filter(Boolean).join(" ")} data-style={fieldStyle} data-long={long ? "true" : undefined} onSubmit={submit} onMouseDown={keepCaret} onClick={focusPrompt}>
      <textarea ref={inputRef} className={`zen-ai-field__input ${typographyStyles["Body/Extra/Medium"]}`} rows={1} value={text} aria-label={placeholder} disabled={disabled} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} />
      {/* Figma Text (trunc): one line with an ellipsis — a textarea placeholder can only clip, so it is drawn here. */}
      {text ? null : <span className={`zen-ai-field__placeholder ${typographyStyles["Body/Extra/Medium"]}`} aria-hidden="true">{placeholder}</span>}
      <div className="zen-ai-field__leading">
        <IconButton appearance="flat" level="primary" size="md" aria-label={t.addFilesAndTools} disabled={disabled} onClick={onAttach} icon={<Icon name="icon-plus-line" />} />
      </div>
      <div className="zen-ai-field__trailing">
        {model ? (
          <button type="button" className={`zen-ai-field__model ${typographyStyles["Body/Base/Medium"]}`} onClick={onModelClick} aria-haspopup="menu" disabled={disabled}>
            {model}<Icon name="icon-chevron-down-line" decorative />
          </button>
        ) : null}
        <IconButton appearance="flat" level="primary" size="md" aria-label={t.dictate} disabled={disabled} onClick={onVoice} icon={<Icon name="icon-microphone-line" />} />
        {primary}
      </div>
    </form>
  );
}

export interface AiChatAction {
  /** An icon name ("icon-copy-line") or your own icon element. */
  icon: IconName | ReactElement;
  label: string;
  onClick?: () => void;
  pressed?: boolean;
}

export interface AiChatBubbleProps {
  side: "you" | "ai";
  children?: ReactNode;
  /** Figma Items slot: actions shown on hover / focus (You: copy · edit; AI: like · dislike · regenerate · copy). */
  actions?: AiChatAction[];
  /** AI: which answer version is shown ("1/2"), next to the actions. */
  version?: ReactNode;
  /** AI: the reply is still streaming (a pulsing caret follows the text). */
  streaming?: boolean;
  /** AI: the assistant is working and no text has arrived yet — three dots in a looping wave. Also shown when `streaming` has no content yet. */
  thinking?: boolean;
  /** Accessible name of the thinking indicator (the locale's "Thinking" by default). */
  thinkingLabel?: string;
  className?: string;
}

/**
 * Figma AI/Chat-Bubble (4218:1270): You = a Neutral/Subtle bubble (radius 24, padding 12/16, right-aligned, max 560);
 * AI = plain Body/Extra/Regular text across the column. Both use Body/Extra/Regular; actions appear under the bubble on hover.
 */
export function AiChatBubble({ side, children, actions = [], version, streaming = false, thinking = false, thinkingLabel: thinkingLabelProp, className }: AiChatBubbleProps) {
  const t = useZenLabels();
  const thinkingLabel = thinkingLabelProp ?? t.thinking;
  const empty = children === undefined || children === null || children === false || children === "";
  const dots = side === "ai" && (thinking || (streaming && empty));
  return (
    <div className={["zen-ai-bubble", className].filter(Boolean).join(" ")} data-side={side} data-streaming={streaming && !dots ? "true" : undefined} data-thinking={dots ? "true" : undefined} aria-busy={streaming || dots || undefined}>
      {dots
        ? <span className="zen-ai-thinking" role="status" aria-label={thinkingLabel}><i /><i /><i /></span>
        : <div className={`zen-ai-bubble__content ${typographyStyles["Body/Extra/Regular"]}`}>{children}</div>}
      {actions.length || version ? (
        <div className="zen-ai-bubble__actions">
          {actions.map((action) => (
            <Tooltip key={action.label} content={action.label} placement="bottom">
              <IconButton appearance="flat" level="primary" size="sm" aria-label={action.label} aria-pressed={action.pressed} onClick={action.onClick} icon={renderIcon(action.icon)} />
            </Tooltip>
          ))}
          {version ? <span className={`zen-ai-bubble__version ${typographyStyles["Body/Small/Regular"]}`}>{version}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export interface AiChatSuggestion {
  label: string;
  /** Leading icon: an icon name ("icon-lightbulb-line") or your own icon element. */
  icon?: IconName | ReactElement;
  onClick?: () => void;
}

/** Figma AI/Chat-Block/Pale (7140:115622): Say-Hi (44px logo + Heading/1) · Chat-Field · Chip/Normal suggestions (Medium, Secondary, Leading-Icon). */
export function AiChatBlock({ greeting: greetingProp, logo, suggestions = [], children, className }: { /** Say-Hi heading (the locale's "How can I help you today?" by default). */ greeting?: ReactNode; /** Say-Hi logo: an icon name or your own node (the Zen mark by default). */ logo?: IconName | ReactNode; suggestions?: AiChatSuggestion[]; children: ReactNode; className?: string }) {
  const t = useZenLabels();
  const greeting = greetingProp === undefined ? t.greeting : greetingProp;
  return (
    <section className={["zen-ai-block", className].filter(Boolean).join(" ")} aria-label={t.assistant}>
      <div className="zen-ai-block__hello">
        <span className="zen-ai-block__logo" aria-hidden="true">{renderIcon(logo ?? "icon-zen")}</span>
        <h2 className={`zen-ai-block__greeting ${typographyStyles["Heading/1"]}`}>{greeting}</h2>
      </div>
      <div className="zen-ai-block__contents">
        {children}
        {suggestions.length ? (
          <div className="zen-ai-block__suggestions">
            {suggestions.map((s) => <Chip key={s.label} variant="normal" size="medium" level="secondary" theme={s.icon ? "leading-icon" : "text-only"} leading={s.icon ? renderIcon(s.icon) : undefined} onClick={s.onClick}>{s.label}</Chip>)}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Conversation column (max 800, gap 24); the field docks at the bottom. */
export function AiChatThread({ children, "aria-label": ariaLabelProp, className }: { children: ReactNode; /** Accessible name of the conversation (the locale's "Conversation" by default). */ "aria-label"?: string; className?: string }) {
  const t = useZenLabels();
  return <div className={["zen-ai-thread", className].filter(Boolean).join(" ")} role="log" aria-label={ariaLabelProp ?? t.conversation} aria-live="polite">{children}</div>;
}
