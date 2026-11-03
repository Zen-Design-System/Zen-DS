/* App Shell › Expressive layouts (Figma section D of ◇ Master-Layout · Example), one docs page of finished apps
   (examples/appShellLayouts.ts). The screens are built in ./app-shell/*. */
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import type { ExampleDef } from "../types";
import { examples as expressive1 } from "./app-shell/d-expressive-1";
import { examples as expressive2 } from "./app-shell/d-expressive-2";

export const page: PlatformPage = "app-shell-expressive";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [...expressive1, ...expressive2]);
