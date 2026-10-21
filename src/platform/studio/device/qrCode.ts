import { encode } from "uqr";

/*
 * The QR code of Open on phone, loaded on demand (OpenOnPhone.tsx imports this module only when its dialog opens): a
 * checkout whose node_modules lacks `uqr` still runs the Studio, and the dialog shows the link alone.
 */

/** The modules of `text`'s QR code, true for dark (error correction M; no border: the SVG draws the quiet zone). */
export function qrModules(text: string): boolean[][] {
  return encode(text, { ecc: "M", border: 0 }).data;
}
