/* Image & Thumbnail examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex
   Duong, Wednesday Sep 30, 2026, 10:30 am. Each example teaches one picture decision: a Thumbnail strip inside a named
   radio group, a frame that holds its place while loading and keeps it when a file fails, Thumbnails in list rows and
   table cells, cover or contain in fixed channel ratios, a cut-out without its frame, and lazy pictures in a phone feed.
   Each example is its own file in image/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import Moodboard from "./image/moodboard-strip.example";
import moodboard from "./image/moodboard-strip.example.tsx?raw";
import RecapPhotos from "./image/loading-and-failed.example";
import recapPhotos from "./image/loading-and-failed.example.tsx?raw";
import MoodboardUploads from "./image/thumbnails-in-a-list.example";
import moodboardUploads from "./image/thumbnails-in-a-list.example.tsx?raw";
import AssetLibrary from "./image/thumbnails-in-a-table.example";
import assetLibrary from "./image/thumbnails-in-a-table.example.tsx?raw";
import ChannelPreviews from "./image/fill-or-fit-a-frame.example";
import channelPreviews from "./image/fill-or-fit-a-frame.example.tsx?raw";
import CutOutMascot from "./image/a-cut-out-picture.example";
import cutOutMascot from "./image/a-cut-out-picture.example.tsx?raw";
import PhoneFeed from "./image/feed-on-a-phone.example";
import phoneFeed from "./image/feed-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "image";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Moodboard strip",
    description: "A strip of Thumbnails picks the large picture. The strip is a radio group with one Tab stop: each Thumbnail sits in a radio button that carries the name, so the Thumbnail itself is alt=\"\", and the arrow keys move the choice. The large Image loads eagerly and its caption adds what the picture can't say.",
    render: () => <Moodboard />,
    code: exampleCode(moodboard),
  },
  {
    title: "Loading and failed",
    description: "With a ratio, a picture's frame holds its size while the Skeleton shows, so nothing jumps when it arrives. A file that can't be read keeps its frame with the neutral placeholder, its alt still naming it, and a Negative Inline Message offers Try again.",
    render: () => <RecapPhotos />,
    code: exampleCode(recapPhotos),
  },
  {
    title: "Thumbnails in a list",
    description: "A Thumbnail at the default md (40px) is the leading visual of a list row, alt=\"\" because the row title names the file. A file the browser can't preview keeps its frame and says so in the caption. Delete removes a row with Undo; an empty list offers Upload photos.",
    render: () => <MoodboardUploads />,
    code: exampleCode(moodboardUploads),
  },
  {
    title: "Thumbnails in a table",
    wide: true,
    description: "In a captioned media cell the Thumbnail is Small (32px); a cell without a caption, like Owner, takes the XSmall step. The table sits on the page under its heading: Project filters it, the columns sort, and a row opens the photo in a Side Panel at its own ratio. On a phone it keeps the photo column alone, with the size and date in its caption.",
    render: () => <AssetLibrary />,
    code: exampleCode(assetLibrary),
  },
  {
    title: "Fill or fit a frame",
    wide: true,
    description: "One tall photo in each channel's ratio. Cover (the default) fills the frame and crops; Contain shows the whole picture on Neutral/Pale bars, for photos whose edges matter. Each column is as wide as its ratio, so the frames line up at one height.",
    render: () => <ChannelPreviews />,
    code: exampleCode(channelPreviews),
  },
  {
    title: "A cut-out picture",
    description: "A mascot with its backdrop removed, for a client's brand kit. On the default frame (Neutral/Pale with a hairline, so a light photo keeps its edge) a faint square shows around the cut-out; frame={false} drops the fill and the hairline and the picture sits on the card itself. The Skeleton and the error placeholder still fill the box.",
    render: () => <CutOutMascot />,
    code: exampleCode(cutOutMascot),
  },
  {
    title: "Feed on a phone",
    description: "In the studio's Updates feed, pictures load lazily (the default) as the screen scrolls, each frame keeping its ratio until then. A photo that can't be read keeps its frame and offers Reload photo; while the picture loads again, focus waits on the author's name, so it stays in the post.",
    render: () => <PlatformPhoneApp label="Zen updates" app={PhoneFeed} />,
    code: exampleCode(phoneFeed),
  },
]);
