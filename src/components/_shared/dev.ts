// Bundlers replace `process.env.NODE_ENV` statically (keep the exact expression); without one, `process` is missing.
declare const process: { env: { NODE_ENV?: string } };

/** True in development builds (dev warnings only). */
export function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}
