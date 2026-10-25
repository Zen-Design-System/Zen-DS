export type ScreenDeviceBars = "none" | "phone" | "tablet" | "duo-side" | "duo-corner" | "duo-island";

export type ScreenDevice = {
  id: string;
  label: string;
  short: string;
  device: "phone" | "tablet" | "desktop";
  layout?: "mobile" | "desktop";
  width: number;
  height: number;
  icon: string;
  os?: "ios" | "android";
  bars: ScreenDeviceBars;
  radius: number;
  turn?: string;
  fold?: string;
  foldAt?: { axis: "x" | "y"; at: number; size: number };
};

export const SCREEN_DEVICES: ReadonlyArray<ScreenDevice>;
export const FRAME_DEVICES: ReadonlyArray<ScreenDevice>;
export function screenDevice(id: string | null | undefined): ScreenDevice | undefined;
export function deviceOfSize(width: number | undefined, height: number | undefined): ScreenDevice | undefined;
export function deviceOs(entry: ScreenDevice | null | undefined): "ios" | "android";
export function deviceOfScreen(device: string | undefined, layout: string | undefined, width: unknown, height: unknown, os?: "ios" | "android"): ScreenDevice | undefined;
export function deviceSize(entry: ScreenDevice): string;

export type FramePreset = { id: string; label: string; width: number; height: number; device: "phone" | "tablet" | "desktop"; layout?: "mobile" | "desktop"; zen?: string };
export type FramePresetGroup = { id: string; label: string; icon: string; presets: ReadonlyArray<FramePreset> };
export const FRAME_PRESET_GROUPS: ReadonlyArray<FramePresetGroup>;
export function framePreset(id: string): FramePreset | undefined;

export type ZenBreakpointKey = "desktop" | "tablet" | "mobile";
export const BREAKPOINTS: ReadonlyArray<ZenBreakpointKey>;
export const BREAKPOINT_LABELS: Readonly<Record<ZenBreakpointKey, string>>;
export const BREAKPOINT_ICONS: Readonly<Record<ZenBreakpointKey, string>>;
export const BREAKPOINT_MIN: Readonly<Record<ZenBreakpointKey, number>>;
export function breakpointOfWidth(width: number): ZenBreakpointKey;
export function screenBreakpoint(device: string | undefined, width: unknown): ZenBreakpointKey;
export function breakpointDevice(breakpoint: ZenBreakpointKey, os?: "ios" | "android"): ScreenDevice | undefined;
export function widthDevice(width: number, height: number): ScreenDevice;
/** A Screen's view: a device's id (screenDevice), or "width" with a typed width. */
export type ScreenView = { device: string; width: number };
export function viewDevice(view: ScreenView | null | undefined, height?: number): ScreenDevice | undefined;
