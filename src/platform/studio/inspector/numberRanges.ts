/*
 * Number props with a known range (user, 2026-10-15: Slider field for the props whose min–max is known): the Inspector
 * edits them with Figma's Slider/Field (SliderField) — drag to scrub, click to type — instead of a number field. The
 * ranges are the components' own (their JSDoc and defaults); a value outside one (a custom `max`) keeps the number field.
 */

export type NumberRange = { min: number; max: number; step: number; format?: (value: number) => string };

const percent: NumberRange = { min: 0, max: 100, step: 1, format: (value) => `${value}%` };
const share: NumberRange = { min: 0, max: 1, step: 0.05 };
const stars: NumberRange = { min: 0, max: 5, step: 1 };

const ranges: Readonly<Record<string, NumberRange>> = {
  "ProgressBar.value": percent,
  "ProgressCircle.value": percent,
  "GaugeChart.value": percent,
  "Slider.value": { min: 0, max: 100, step: 1 },
  "Slider.defaultValue": { min: 0, max: 100, step: 1 },
  "SliderField.value": { min: 0, max: 100, step: 1 },
  "SliderField.defaultValue": { min: 0, max: 100, step: 1 },
  "Rating.value": stars,
  "Rating.defaultValue": stars,
  "RatingDisplay.value": { min: 0, max: 5, step: 0.5 },
  "ChatVoice.progress": share,
  "CurvePreview.bounce": share,
};

/** The range of `component`'s number prop `prop`, or null (no known range, or `value` lies outside it). */
export function numberRange(component: string | undefined, prop: string, value: number | undefined): NumberRange | null {
  const range = component ? ranges[`${component}.${prop}`] : undefined;
  if (!range) return null;
  if (value !== undefined && (value < range.min || value > range.max)) return null;
  return range;
}
