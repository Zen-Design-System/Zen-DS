import type { Plugin } from "vite";

/** Dev server on both loopback families: listens on the loopback address Vite did not bind and pipes it to the one it did. */
export function loopbackBothFamilies(): Plugin;
