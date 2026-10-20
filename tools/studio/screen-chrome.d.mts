// Types for screen-chrome.mjs (the builder Screen's app frame).
export type ScreenChromeProp = "sidebar" | "header" | "topNavigation" | "bottomNavigation";
export type ScreenChromeLayout = "mobile" | "desktop";
export declare const SCREEN_LAYOUTS: readonly ScreenChromeLayout[];
export declare const SCREEN_CHROME: ReadonlyArray<{ prop: ScreenChromeProp; layout: ScreenChromeLayout; label: string; component: string }>;
export declare function screenLayout(device: string | undefined, layout?: string): ScreenChromeLayout;
export declare function screenChromeCode(prop: ScreenChromeProp, title?: string): string;
/** The desktop layout's master layout: the root AppShell's parts the Screen section switches (screen-frame.mjs). */
export type ScreenFrameProp = "banner" | "sidebar" | "leading" | "center" | "actions" | "main" | "sidePanel" | "floatingActions";
export declare const FRAME_PARTS: ReadonlyArray<{ prop: ScreenFrameProp; host: "shell" | "header"; label: string; component: string }>;
export declare const FRAME_PROPS: ReadonlySet<string>;
/** The AppShellHeader props that draw part of the header. */
export declare const HEADER_PROPS: ReadonlySet<string>;
export declare function screenHeaderCode(parts: ReadonlyArray<readonly [string, string]>): string;
export declare function screenFrameCode(prop: ScreenFrameProp, title?: string | null): string;
/** Whether a page may hold a Screen's old frame props (`sidebar` / `header`): screen-frame.mjs migrateScreenFrame. */
export declare const LEGACY_FRAME: RegExp;
