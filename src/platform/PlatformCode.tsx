import { createPortal } from "react-dom";
import { useStudioBridge, useStudioPanel } from "./studio/bridge";
import { CodeView } from "./studio/code/CodeView";

export function PlatformCode({ code }: { code: string }) {
  const studio = useStudioBridge();
  const panel = useStudioPanel();
  // Zen Studio: a playground's code shows in the inspector while its panel is active; other code (Installation) renders
  // in place. Both use the Studio's git-style code view.
  if (studio && panel) return panel.active && panel.codeSlot ? createPortal(studio.renderCode(code), panel.codeSlot) : null;
  if (studio) return <>{studio.renderCode(code)}</>;
  return <PlatformCodeView code={code} />;
}

/** Classic docs: the same git-style code view as Zen Studio (React · TSX badge, line numbers, Wrap and Copy). */
function PlatformCodeView({ code }: { code: string }) {
  return (
    <section className="platform-code" aria-label="Code preview">
      <CodeView code={code} language="tsx" />
    </section>
  );
}
