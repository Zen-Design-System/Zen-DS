/** Status words agents know from other libraries (Chakra `status`, MUI `severity` values), accepted by the feedback
 * components (Toast, AlertBanner, InlineMessage) next to Zen's own tone names. */
export type StatusAlias = "success" | "error" | "warning" | "info";

const toneByStatus = { success: "positive", error: "negative", warning: "warning", info: "info" } as const;

/** `success` → positive, `error` → negative; `warning` and `info` keep their name. */
export const toneFromStatus = (status: StatusAlias | undefined) => (status ? toneByStatus[status] : undefined);
