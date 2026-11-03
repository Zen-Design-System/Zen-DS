/* App Shell › Consumer layouts (Figma section E of ◇ Master-Layout · Example), one docs page of finished apps
   (examples/appShellLayouts.ts). The screens are built in ./app-shell/*. */
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import type { ExampleDef } from "../types";
import { examples as consumer1 } from "./app-shell/e-consumer-1";
import { examples as consumer2 } from "./app-shell/e-consumer-2";

export const page: PlatformPage = "app-shell-consumer";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [...consumer1, ...consumer2]);
