import type { ReactNode } from "react";

/** Platform pages for the app-composition layer (Phase 2). Each group module in this folder owns some of them. */
export const appLayerPageIds = ["layout", "text", "link", "menu", "description-list", "action-bar", "image", "visually-hidden", "form", "app-shell", "page-header", "templates"] as const;
export type AppLayerPage = (typeof appLayerPageIds)[number];

export type AppLayerPageMeta = {
  /** Sidebar and breadcrumb label. */
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  /** The page's playground panel (rendered in the Playground section). */
  playground: () => ReactNode;
};

export type ExampleDef = { title: string; description: string; code: string; wide?: boolean; /** A whole desktop screen: the card offers Full screen. */ screen?: boolean; render: () => ReactNode };
/** Examples per platform page id (string keys so a group can also add examples to existing pages, e.g. "sidebar"). */
export type ExampleMap = Record<string, ExampleDef[]>;
