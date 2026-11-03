/* App Shell › Smart home layouts (Figma section F of ◇ Master-Layout · Example), one docs page of finished apps
   (examples/appShellLayouts.ts). The screens are built in ./app-shell/*. */
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import type { ExampleDef } from "../types";
import { examples as smartHome1 } from "./app-shell/f-smart-home-1";
import { examples as smartHome2 } from "./app-shell/f-smart-home-2";
import { examples as smartHome3 } from "./app-shell/f-smart-home-3";

export const page: PlatformPage = "app-shell-smart-home";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [...smartHome1, ...smartHome2, ...smartHome3]);
