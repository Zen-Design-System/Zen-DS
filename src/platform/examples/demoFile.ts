import data from "./data.ts?raw";
import { demoFileOf } from "./exampleCode";

/** examples/data.ts as the demo.ts every example snippet imports: the Code view offers it to copy (code/SnippetCode). */
export const demoFile = demoFileOf(data);
