/**
 * The curves CurvePreview draws, as progress (0 → 1, a spring overshoots past 1) over normalised time (0 → 1).
 * Figma Chart/Curve-Preview (15663:110887) draws the same functions: Spring and Bounce are damped springs, the
 * damping ratio is `1 − bounce` (Framer Motion's convention); Ease-Out and Ease-In-Out are cubic Béziers.
 */
export type CurveType = "spring" | "bounce" | "ease-out" | "ease-in-out";

/** Each spring's default bounce and its natural frequency (rad per preview width): Figma's two curves exactly. */
export const springCurves = { spring: { bounce: 0.3, frequency: 16 }, bounce: { bounce: 0.7, frequency: 18 } } as const;
/** Ease-Out is Motion/Ease/Emphasized; Ease-In-Out is the symmetric cubic (.65 0 .35 1). */
export const bezierCurves = { "ease-out": [0.16, 1, 0.3, 1], "ease-in-out": [0.65, 0, 0.35, 1] } as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** A damped spring released from 0 towards 1. */
export function springProgress(time: number, bounce: number, frequency: number) {
  const damping = 1 - clamp01(bounce);
  if (damping >= 1) return 1 - Math.exp(-frequency * time) * (1 + frequency * time);
  const damped = frequency * Math.sqrt(1 - damping * damping);
  const decay = Math.exp(-damping * frequency * time);
  return 1 - decay * (Math.cos(damped * time) + ((damping * frequency) / damped) * Math.sin(damped * time));
}

/** The y of a CSS cubic-bezier(x1, y1, x2, y2) at a given x (time). */
export function bezierProgress(time: number, [x1, y1, x2, y2]: readonly [number, number, number, number]) {
  const at = (u: number, a: number, b: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  // Bisection on x(u) = time: x is monotonic for 0 ≤ x1, x2 ≤ 1, and 30 halvings are far below a pixel.
  let low = 0;
  let high = 1;
  for (let step = 0; step < 30; step += 1) {
    const middle = (low + high) / 2;
    if (at(middle, x1, x2) < time) low = middle; else high = middle;
  }
  return at((low + high) / 2, y1, y2);
}

/** Progress at each of `samples + 1` evenly spaced times. */
export function curveProgress(type: CurveType, bounce?: number, samples = 80) {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const time = index / samples;
    if (type === "spring" || type === "bounce") {
      const spring = springCurves[type];
      return springProgress(time, bounce ?? spring.bounce, spring.frequency);
    }
    return bezierProgress(time, bezierCurves[type]);
  });
}
