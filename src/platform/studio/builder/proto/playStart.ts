import { studioStore } from "../../store";

export { OVERLAY_START, playStartOf } from "./protoModel";

/*
 * Where Play starts (builder/proto/Player.tsx): `presenting` is "play:<start>" while a page you made plays. <start> is a
 * Screen's id, "overlay:<id>" for an Overlay frame (Figma presents any frame: it opens over the Screen that opens it),
 * or empty for the first Screen. Apart from the Player, so the board's Present (board/presentFrame.ts) starts it too.
 */

export const PLAY_PREFIX = "play:";
export const isPlaying = (presenting: string | null | undefined) => Boolean(presenting?.startsWith(PLAY_PREFIX));

/** Starts Play on the open builder page (at `start`, else its first Screen). */
export function startPlay(start?: string | null) {
  const state = studioStore.getState();
  if (!state.localPage) return;
  studioStore.setState({ presenting: `${PLAY_PREFIX}${start ?? ""}` });
}

export const stopPlay = () => { if (isPlaying(studioStore.getState().presenting)) studioStore.setState({ presenting: null }); };
