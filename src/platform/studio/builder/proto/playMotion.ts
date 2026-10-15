import type { CSSProperties } from "react";
import { DEFAULT_ANIMATION, DEFAULT_DIRECTION, DEFAULT_DURATION, type ProtoDirection, type ProtoOptions } from "./protoModel";

/*
 * Play's animations between frames (Figma's): which way the frame coming in and the one going away move, as custom
 * properties the `studio-play-motion` keyframes read (builder.css). Distances are fractions of the frame's own size and
 * are multiplied by --zen-motion-movement there (0 with reduced motion: only the fades stay); durations are Motion tokens.
 *
 * Forward, the frame coming in is on top: it fades in (Dissolve) or moves in from the side the direction points away
 * from (Move in, Push, Slide in); the one going away stays (Dissolve, Move in), is pushed out (Push) or shifts by a third
 * (Slide in). Back plays the same way in backwards: the frame going away is on top and leaves the way it came.
 */

/** Where the next frame comes from, per direction it moves (a fraction of its size on each axis). */
const FROM: Readonly<Record<ProtoDirection, readonly [number, number]>> = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] };
/** How far the current frame shifts under a Slide in. */
const SLIDE_SHIFT = 0.3;

export type Motion = { style: CSSProperties; top: boolean };

const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;

/** The motion of a frame coming in (`enter`) or going away (`leave`) under `options`; null for Instant. */
export function frameMotion(options: ProtoOptions | undefined, role: "enter" | "leave", reverse = false): Motion | null {
  const animation = options?.animation ?? DEFAULT_ANIMATION;
  if (animation === "instant") return null;
  const [x, y] = FROM[options?.direction ?? DEFAULT_DIRECTION];
  const vars: Record<string, string> = { "--studio-play-duration": `var(--zen-motion-duration-${options?.duration ?? DEFAULT_DURATION})` };
  const from = (factor: number) => { vars["--studio-play-from-x"] = percent(x * factor); vars["--studio-play-from-y"] = percent(y * factor); };
  const to = (factor: number) => { vars["--studio-play-to-x"] = percent(x * factor); vars["--studio-play-to-y"] = percent(y * factor); };
  if (!reverse && role === "enter") {
    if (animation === "dissolve") vars["--studio-play-from-opacity"] = "0";
    else from(1);
  } else if (!reverse && role === "leave") {
    if (animation === "push") to(-1);
    else if (animation === "slide") to(-SLIDE_SHIFT);
  } else if (reverse && role === "leave") {
    if (animation === "dissolve") vars["--studio-play-to-opacity"] = "0";
    else to(1);
  } else {
    if (animation === "push") from(-1);
    else if (animation === "slide") from(-SLIDE_SHIFT);
  }
  // On top: what comes in going forward, what goes away going back.
  return { style: vars as CSSProperties, top: role === "enter" ? !reverse : reverse };
}

/** The attributes that run a motion on its element (none for Instant). */
export const motionProps = (motion: Motion | null) => (motion ? { "data-motion": "", "data-top": motion.top ? "" : undefined, style: motion.style } : {});
