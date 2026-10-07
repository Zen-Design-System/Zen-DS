// App-mode fixture (zen-usage outside the repo, and the ESLint plugin): only tags imported from @zen/design-system
// are checked — named imports, aliases and namespace imports — never the app's own components with the same names.
// Every `expect:` marker must be reported exactly once by both the CLI (--consumer) and ESLint.
import { Button as ZenButton, IconButton } from "@zen/design-system";
import * as Zen from "@zen/design-system";
import { Button } from "./local-button";

export function App() {
  return (
    <main>
      {/* The app's own Button: never judged by Zen's rules. */}
      <Button level="secondary">Own button</Button>
      {/* expect: button/secondary-justified */}
      <ZenButton level="secondary">Pinned</ZenButton>
      {/* expect: icon-button/needs-name  expect: icon-button/needs-action */}
      <IconButton icon="icon-plus-line" />
      {/* expect: button/vague-label */}
      <Zen.Button>OK</Zen.Button>
      {/* expect: api/deprecated-prop  expect: interaction/no-noop-handler */}
      <Zen.Tabs aria-label="Sections" items={[{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity" }]} onChange={() => undefined} />
      {/* expect: layout/use-stack  expect: interaction/no-noop-handler */}
      <div style={{ display: "flex", gap: 8 }}><ZenButton level="primary" onClick={() => undefined}>Save changes</ZenButton></div>
      {/* expect: text/use-text */}
      <h2>Team members</h2>
      {/* expect: app-shell/forced-layout */}
      <Zen.AppShell layout="sidebar"><Zen.Text>Page</Zen.Text></Zen.AppShell>
      {/* zen-allow-secondary: toolbar toggle that stays pressed */}
      <ZenButton level="secondary">Bold</ZenButton>
    </main>
  );
}
