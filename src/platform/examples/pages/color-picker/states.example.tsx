import { useState } from "react";
import { ColorField, Stack } from "@zen-ds/react";

/** Error, read-only, disabled and no picker. */
export default function ColorFieldStates() {
  const [accent, setAccent] = useState("#1F6FEB");
  const [typed, setTyped] = useState("");
  return (
    <Stack gap="lg" maxWidth={360}>
      <ColorField label="Accent colour" value={accent} onValueChange={setAccent} error={typed && !/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(typed) ? "Enter a hex colour like #1F6FEB." : undefined}
        onChange={(event) => setTyped(event.target.value)} onBlur={() => setTyped("")} helpText="Type a hex value; six digits apply at once." />
      <ColorField label="Workspace colour" defaultValue="#0E9F8E" readOnly helpText="Set by your organisation's admin." />
      <ColorField label="Logo background" defaultValue="#E5533D" disabled helpText="Upload a logo first." />
      <ColorField label="Chart line" defaultValue="#8E44C4" colorPicker={false} helpText="Without a picker: a hex field with its swatch." />
    </Stack>
  );
}
