// A wider slice of the public API, type-checked with skipLibCheck:false against the packed declarations.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "@zen-ds/react/styles.css";
import "@zen-ds/react/reset.css";
import { Badge, Button, Heading, Icon, IconButton, InputField, Tabs, ZenProvider, preloadIcons, typographyStyles, useZen, type IconName } from "@zen-ds/react";
import { iconNames } from "@zen-ds/react/icons/names";
import { tokens } from "@zen-ds/react/tokens";

// A name no Zen component uses itself, so it comes from a lazy bucket.
const lazyIcon: IconName = "icon-rocket-line";
void preloadIcons([lazyIcon]);
// The text-style class map is public API too (for your own elements).
const captionClass: string = typographyStyles["Caption/Regular"];

function ThemeLabel() {
  return <Badge>{useZen()?.theme ?? "inherited"}</Badge>;
}

function App() {
  const [tab, setTab] = useState("overview");
  const [email, setEmail] = useState("");
  return (
    <main style={{ padding: tokens["Spacing/Padding/Large"] ?? 24 }}>
      <Heading level={1}>Consumer smoke ({iconNames.length} icons)</Heading>
      <Tabs
        aria-label="Sections"
        value={tab}
        onValueChange={setTab}
        items={[{ id: "overview", label: "Overview" }, { id: "members", label: "Members" }, { id: "settings", label: "Settings" }]}
      />
      <InputField label="Email" placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Icon name={lazyIcon} size="md" title="Launch" />
      <Badge className={captionClass}>New</Badge>
      <ThemeLabel />
      <IconButton aria-label="Settings" icon={<Icon name="icon-settings-01-line" />} onClick={() => setTab("settings")} />
      <Button level="primary">Save changes</Button>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <ZenProvider theme="system" typography="dashboard">
    <App />
  </ZenProvider>,
);
