/* Color Picker examples. Each example is its own file in color-picker/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export and shows its text as the
   snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import BrandColour from "./color-picker/brand-colour.example";
import brandColour from "./color-picker/brand-colour.example.tsx?raw";
import PropertyPanel from "./color-picker/property-panel.example";
import propertyPanel from "./color-picker/property-panel.example.tsx?raw";
import InlinePicker from "./color-picker/inline-picker-and-formats.example";
import inlinePickerAndFormats from "./color-picker/inline-picker-and-formats.example.tsx?raw";
import ColorFieldStates from "./color-picker/states.example";
import states from "./color-picker/states.example.tsx?raw";
import PhoneTheme from "./color-picker/theme-colour-on-a-phone.example";
import themeColourOnAPhone from "./color-picker/theme-colour-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "color-picker";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Brand colour",
    description: "A ColorField in a settings form: the swatch and the hex, the brand palette as saved colours, and a preview that follows every change. Click the field or press ↓ to open the picker; Escape closes it and focus stays in the field.",
    render: () => <BrandColour />,
    code: exampleCode(brandColour),
  },
  {
    title: "Property panel",
    description: "Inline fields (layout=\"inline\") in a dense panel: the label inside the field, the value at the end, a colour as its swatch. Each group is its own stack and the panel stacks them with no gap, so every rule has the same space above and below; the Accordion sets the title → rows gap itself.",
    render: () => <PropertyPanel />,
    code: exampleCode(propertyPanel),
    wide: true,
  },
  {
    title: "Inline picker and formats",
    description: "An always-open ColorPicker in a panel, on HSL. Tab reaches the area (← → saturation, ↑ ↓ brightness, Shift for 10 steps), the hue slider, the Format select and the channels (each named in full: Hue, Saturation, Lightness); Enter applies a typed channel.",
    render: () => <InlinePicker />,
    code: exampleCode(inlinePickerAndFormats),
  },
  {
    title: "States",
    description: "Error while the typed text is not a colour (anything else goes back to the last colour on blur), Read-only for a value set elsewhere, Disabled with its reason, and colorPicker={false} for a plain hex field.",
    render: () => <ColorFieldStates />,
    code: exampleCode(states),
  },
  {
    title: "Theme colour on a phone",
    description: "A Large ColorField on an event's theme screen in the AppShell's mobile Bar; the picker opens under it at 240px. The ticket preview and the swatches beside the places it applies follow every change, a warning names the contrast when white ticket text would get hard to read, and Reset / Save theme in the Action bar wake up once the colour changes.",
    render: () => <PlatformPhoneApp label="Event theme" canvas="default" app={PhoneTheme} />,
    code: exampleCode(themeColourOnAPhone),
  },
]);
