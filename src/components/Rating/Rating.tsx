import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { Chip } from "../Chip";
import { Icon } from "../Icon";
import { scaleKey } from "../_shared/scale";
import type { ZenLabels } from "../_shared/labels";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./rating.css";
import "../Icon/core";

export const ratingSizes = ["xsmall", "small", "medium", "large", "xlarge"] as const;
export const ratingThemes = ["default", "neutral", "accent"] as const;
/** CSS / Figma key (the `data-size` value). */
type RatingSizeKey = (typeof ratingSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type RatingSize = "xs" | "sm" | "md" | "lg" | "xl" | "xsmall" | "small" | "medium" | "large" | "xlarge";
export type RatingTheme = (typeof ratingThemes)[number];

export interface RatingProps {
  value?: number;
  defaultValue?: number;
  /** Called with the chosen number of stars. */
  onValueChange?: (value: number) => void;
  /** @deprecated Use onValueChange (same arguments). */
  onChange?: (value: number) => void;
  /** Number of stars (Figma: 5). */
  max?: number;
  /** Figma Size: XSmall 12 · Small 16 · Medium 20 · Large 28 · XLarge 44 (Element-Size/Popular). Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: RatingSize;
  /** Figma Theme: Default (Support/Yellow/Light) · Neutral (Neutral/Strongest) · Accent (Accent/Light); empty stars Content/Placeholder. */
  theme?: RatingTheme;
  /** Name of the rated thing, e.g. "Rate this template" (default "Rating", from the locale's labels). */
  "aria-label"?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Figma Rating/Star (1536:26008): a star input — one radio per star (arrow keys move, Space/click sets), hover previews
 * the value. Stars are icon-star-01-solid with gap 3XSmall.
 */
export function Rating({ value, defaultValue = 0, onValueChange, onChange, max = 5, size: sizeProp = "md", theme = "default", "aria-label": ariaLabelProp, name, disabled = false, className }: RatingProps) {
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.rating;
  const size = scaleKey(sizeProp, ratingSizes);
  const [internal, setInternal] = useState(defaultValue);
  const [hover, setHover] = useState<number | null>(null);
  const autoName = useId();
  const current = value ?? internal;
  const shown = hover ?? current;
  const set = (next: number) => { if (value === undefined) setInternal(next); onValueChange?.(next); onChange?.(next); };
  return (
    <div className={["zen-rating", className].filter(Boolean).join(" ")} data-size={size} data-tone={theme} role="radiogroup" aria-label={ariaLabel} aria-disabled={disabled || undefined} onPointerLeave={() => setHover(null)}>
      {Array.from({ length: max }, (_, index) => {
        const star = index + 1;
        return (
          <label key={star} className="zen-rating__star" data-filled={star <= shown ? "true" : undefined} onPointerEnter={() => !disabled && setHover(star)}>
            <input type="radio" name={name ?? autoName} value={star} checked={current === star} disabled={disabled} aria-label={t.stars(star)} onChange={() => set(star)} />
            <Icon name="icon-star-01-solid" decorative />
          </label>
        );
      })}
    </div>
  );
}

export interface RatingDisplayProps {
  /** 0 – max, decimals allowed (4.5 fills half of the fifth star). */
  value: number;
  max?: number;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: RatingSize;
  theme?: RatingTheme;
  /** Accessible text; defaults to the locale's "4.5 out of 5 stars". */
  label?: string;
  className?: string;
}

/** Figma Rating-Display (9818:5582): a Rating=None base row with the filled row clipped to the value on top. */
export function RatingDisplay({ value, max = 5, size: sizeProp = "md", theme = "default", label, className }: RatingDisplayProps) {
  const t = useZenLabels();
  const locale = useZenLocale();
  const size = scaleKey(sizeProp, ratingSizes);
  const clamped = Math.max(0, Math.min(max, value));
  const stars = Array.from({ length: max }, (_, index) => <Icon key={index} name="icon-star-01-solid" decorative />);
  // One decimal, written the locale's way (en "4.5", vi "4,5").
  const fallbackLabel = t.ratingValue(new Intl.NumberFormat(locale, { useGrouping: false }).format(Number(clamped.toFixed(1))), max);
  return (
    <span className={["zen-rating-display", className].filter(Boolean).join(" ")} data-size={size} data-tone={theme} role="img" aria-label={label ?? fallbackLabel} style={{ "--zen-rating-fill": `${(clamped / max) * 100}%` } as CSSProperties}>
      <span className="zen-rating-display__base" aria-hidden="true">{stars}</span>
      <span className="zen-rating-display__fill" aria-hidden="true">{stars}</span>
    </span>
  );
}

/** The five emotions with their English labels; OpinionScale shows them in the ZenProvider locale (ZenLabels `opinion`). */
export const opinionEmotions = [
  { id: "very-disappointed", emoji: "😡", label: "Very Disappointed" },
  { id: "disappointed", emoji: "🙁", label: "Disappointed" },
  { id: "neutral", emoji: "😐", label: "Neutral" },
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "very-happy", emoji: "😍", label: "Very Happy" },
] as const;
export type OpinionEmotion = (typeof opinionEmotions)[number]["id"];
/** Emotion id → its ZenLabels `opinion` key. */
const opinionLabelKeys: Record<OpinionEmotion, keyof ZenLabels["opinion"]> = {
  "very-disappointed": "veryDisappointed", disappointed: "disappointed", neutral: "neutral", happy: "happy", "very-happy": "veryHappy",
};
const scaleSets: Record<2 | 3 | 5, OpinionEmotion[]> = {
  2: ["disappointed", "happy"],
  3: ["disappointed", "neutral", "happy"],
  5: ["very-disappointed", "disappointed", "neutral", "happy", "very-happy"],
};

export interface OpinionScaleProps {
  /** Figma Scale: 2 · 3 · 5 emoji options. */
  scale?: 2 | 3 | 5;
  value?: OpinionEmotion | null;
  /** Called with the chosen emotion. */
  onValueChange?: (value: OpinionEmotion) => void;
  /** @deprecated Use onValueChange (same arguments). */
  onChange?: (value: OpinionEmotion) => void;
  /** Override option labels (keep them short). */
  labels?: Partial<Record<OpinionEmotion, ReactNode>>;
  "aria-label"?: string;
  className?: string;
}

/**
 * Figma Rating/Opinion-Scale (1536:25762) of .Primitives/Rating/Opinion item: emoji (32) + Caption/Regular label,
 * padding XSmall, gap 2XSmall, Corner-Radius/Base; Hover Neutral/Flat/Hover, Selected Active/Neutral/Subtle + Caption/Bold.
 */
export function OpinionScale({ scale = 5, value, onValueChange, onChange, labels, "aria-label": ariaLabelProp, className }: OpinionScaleProps) {
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.howDoYouFeel;
  const [internal, setInternal] = useState<OpinionEmotion | null>(null);
  const current = value === undefined ? internal : value;
  const name = useId();
  return (
    <div className={["zen-opinion-scale", className].filter(Boolean).join(" ")} role="radiogroup" aria-label={ariaLabel}>
      {scaleSets[scale].map((id) => {
        const option = opinionEmotions.find((item) => item.id === id)!;
        const selected = current === id;
        return (
          <label key={id} className="zen-opinion-item" data-selected={selected ? "true" : undefined}>
            <input type="radio" name={name} value={id} checked={selected} onChange={() => { if (value === undefined) setInternal(id); onValueChange?.(id); onChange?.(id); }} />
            <span className="zen-opinion-item__emoji" aria-hidden="true">{option.emoji}</span>
            <span className={`zen-opinion-item__label ${typographyStyles[selected ? "Caption/Bold" : "Caption/Regular"]}`}>{labels?.[id] ?? t.opinion[opinionLabelKeys[id]]}</span>
          </label>
        );
      })}
    </div>
  );
}

export interface NpsScaleProps {
  /** Figma Scale: 0–5 or 0–10. */
  scale?: 5 | 10;
  value?: number | null;
  /** Called with the chosen score. */
  onValueChange?: (value: number) => void;
  /** @deprecated Use onValueChange (same arguments). */
  onChange?: (value: number) => void;
  /** Figma Top / Bottom criteria: the labels under the two ends (the locale's "Very disappointed" / "Very happy" by default). */
  lowLabel?: ReactNode;
  highLabel?: ReactNode;
  "aria-label"?: string;
  className?: string;
}

/** Figma Rating/NPS-Scale (1536:26034): Chip/Number-Only Small Secondary buttons (gap 2XSmall) over two Caption/Regular end labels. */
export function NpsScale({ scale = 10, value, onValueChange, onChange, lowLabel: lowLabelProp, highLabel: highLabelProp, "aria-label": ariaLabelProp, className }: NpsScaleProps) {
  const t = useZenLabels();
  const lowLabel = lowLabelProp === undefined ? t.npsLow : lowLabelProp;
  const highLabel = highLabelProp === undefined ? t.npsHigh : highLabelProp;
  const ariaLabel = ariaLabelProp ?? t.npsQuestion;
  const [internal, setInternal] = useState<number | null>(null);
  const current = value === undefined ? internal : value;
  return (
    <div className={["zen-nps-scale", className].filter(Boolean).join(" ")}>
      <div className="zen-nps-scale__numbers" role="group" aria-label={ariaLabel}>
        {Array.from({ length: scale + 1 }, (_, n) => (
          <Chip key={n} variant="number-only" size="small" level="secondary" selected={current === n} aria-pressed={current === n} onClick={() => { if (value === undefined) setInternal(n); onValueChange?.(n); onChange?.(n); }}>{n}</Chip>
        ))}
      </div>
      <div className={`zen-nps-scale__labels ${typographyStyles["Caption/Regular"]}`} aria-hidden="true"><span>{lowLabel}</span><span>{highLabel}</span></div>
    </div>
  );
}
