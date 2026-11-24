import { inject, type InjectionKey } from "vue";

/*
 * The content family a Solid card's fill asks of its parts (React: Card/card-content.ts): `inverse` on Neutral/Solid,
 * `on-accent` on Accent/Solid, `on-bright` on the bright Support solids, `on-color` on any other. The Vue Card (wave 2)
 * provides it; outside one, parts read null.
 */
export type CardContent = "inverse" | "on-accent" | "on-color" | "on-bright";

export const cardContentKey: InjectionKey<() => CardContent | null> = Symbol("zen-card-content");

/** What the nearest Solid card asks its parts to draw, read at render time; null outside one. */
export function useCardContent(): () => CardContent | null {
  return inject(cardContentKey, () => null);
}
