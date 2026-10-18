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
export function deviceOfScreen(device: string | undefined, layout: string | undefined, width: unknown, height: unknown): ScreenDevice | undefined;
export function deviceSize(entry: ScreenDevice): string;
