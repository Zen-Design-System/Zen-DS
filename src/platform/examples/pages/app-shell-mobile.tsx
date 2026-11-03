/* App Shell › Mobile layouts (Figma section C of ◇ Master-Layout · Example), one docs page of finished apps
   (examples/appShellLayouts.ts). The screens are built in ./app-shell/*. */
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import type { ExampleDef } from "../types";
import { examples as mobile1 } from "./app-shell/c-mobile-1";
import { examples as mobile2 } from "./app-shell/c-mobile-2";

export const page: PlatformPage = "app-shell-mobile";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [...mobile1, ...mobile2]);
