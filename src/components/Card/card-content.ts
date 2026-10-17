import { createContext, useContext } from "react";

/**
 * The content family a Solid card's fill asks for (Figma variable descriptions; screen-rules §1, user 2026-10-17):
 * `inverse` on Background/Neutral/Solid, `on-accent` on Background/Accent/Solid, `on-bright` on the bright Support solids
 * (Yellow), `on-color` on any other Support solid. Null on every other card (and a selected one, which takes the Surface).
 */
export type CardContent = "inverse" | "on-accent" | "on-color" | "on-bright";

export const CardContentContext = createContext<CardContent | null>(null);

/** The family of a card's fill, from its drawn tone and colour (Card.tsx's `data-tone` / `data-color`). */
export function cardContentOf(tone: string, hue: string | undefined, active: boolean): CardContent | null {
  if (tone !== "solid" || active) return null;
  return hue === "neutral" ? "inverse" : hue === "accent" ? "on-accent" : hue === "yellow" ? "on-bright" : "on-color";
}

/** What the nearest Solid card asks its parts to draw (Metric-Trend, Metric-Tile's Dock-Icon); null outside one. */
export const useCardContent = () => useContext(CardContentContext);
