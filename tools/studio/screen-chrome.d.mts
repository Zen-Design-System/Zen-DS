// Types for screen-chrome.mjs (the builder Screen's app frame).
export type ScreenChromeProp = "sidebar" | "header" | "topNavigation" | "bottomNavigation";
export type ScreenChromeLayout = "mobile" | "desktop";
export declare const SCREEN_LAYOUTS: readonly ScreenChromeLayout[];
export declare const SCREEN_CHROME: ReadonlyArray<{ prop: ScreenChromeProp; layout: ScreenChromeLayout; label: string; component: string }>;
export declare function screenLayout(device: string | undefined, layout?: string): ScreenChromeLayout;
export declare function screenChromeCode(prop: ScreenChromeProp, title?: string): string;
