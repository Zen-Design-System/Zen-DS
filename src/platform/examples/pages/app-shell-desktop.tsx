/* App Shell › Desktop layouts (Figma sections B and G of ◇ Master-Layout · Example), one docs page of finished apps
   (examples/appShellLayouts.ts). The screens are built in ./app-shell/*. */
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import type { ExampleDef } from "../types";
import { examples as desktop1 } from "./app-shell/b-desktop-1";
import { examples as desktop2 } from "./app-shell/b-desktop-2";
import { examples as grid } from "./app-shell/g-grid";

export const page: PlatformPage = "app-shell-desktop";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [...desktop1, ...desktop2, ...grid]);
