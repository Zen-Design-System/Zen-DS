/* App Shell › Consumer layouts (Figma section E of ◇ Master-Layout · Example), one docs page of finished apps
   (examples/appShellLayouts.ts). Each example is its own file in app-shell-consumer/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export, a phone app on the device,
   and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import DeliveryHome from "./app-shell-consumer/e1-delivery-home.example";
import deliveryHome from "./app-shell-consumer/e1-delivery-home.example.tsx?raw";
import ShopHome from "./app-shell-consumer/e2-shop-home.example";
import shopHome from "./app-shell-consumer/e2-shop-home.example.tsx?raw";
import ProductList from "./app-shell-consumer/e3-product-list.example";
import productList from "./app-shell-consumer/e3-product-list.example.tsx?raw";
import Onboarding from "./app-shell-consumer/e4-onboarding.example";
import onboarding from "./app-shell-consumer/e4-onboarding.example.tsx?raw";
import AiHome from "./app-shell-consumer/e5-ai-home.example";
import aiHome from "./app-shell-consumer/e5-ai-home.example.tsx?raw";
import Discover from "./app-shell-consumer/e6-discover.example";
import discover from "./app-shell-consumer/e6-discover.example.tsx?raw";
import BigNumber from "./app-shell-consumer/e7-big-number.example";
import bigNumber from "./app-shell-consumer/e7-big-number.example.tsx?raw";

export const page: PlatformPage = "app-shell-consumer";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "E1 · Delivery home",
    description: "A Support/Brand/Soft band runs from the top edge: the delivery address, a Display/2 greeting next to a 3D mascot with its background removed and the search. Ten emoji category tiles in two rows, two Shadow deal cards with food photos and Accent prices, filter Chips (one selected) and the nearest stores as List-Items. Shell: AppShell/Mobile · Phone · Top=Band · Bottom=Tab-Bar. Fits: Food delivery, Grocery, Campus services, Quick commerce.",
    render: () => <PlatformPhoneApp label="Delivery app" canvas="default" app={DeliveryHome} />,
    code: exampleCode(deliveryHome),
  },
  {
    title: "E2 · Shop home",
    description: "A Support/Brand/Pale band from the top edge holds a two-line greeting and the bell and cart actions (the cart with a dot), then the search. Five Accent Subtle shortcuts (one hue, never five), two wallet tiles, round brand Avatars and the product grid with Chips. Each product photo carries a heart action. Shell: AppShell/Mobile · Phone · Top=Band · Bottom=Tab-Bar. Fits: Fashion, Marketplace, Loyalty, Sneakers.",
    render: () => <PlatformPhoneApp label="Sneaker shop" canvas="default" app={ShopHome} />,
    code: exampleCode(shopHome),
  },
  {
    title: "E3 · Product list",
    description: "A compact bar with Back and the section title, Chips for the collections, a featured brand card (photo, rating, five thumbnails) and a two-column grid with name, colour and price. The cart is the one Accent action on screen, a floating IconButton with its counter. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. Fits: Fashion, Catalogue, Drops, Resale.",
    render: () => <PlatformPhoneApp label="Sneaker shop" canvas="default" app={ProductList} />,
    code: exampleCode(productList),
  },
  {
    title: "E4 · Onboarding",
    description: "The brand mark over a Support/Brand/Pale band where portrait photos fan out (rounded frames, a white ring each). A Surface sheet with rounded top corners carries the promise in Heading/2, the Primary Get started, a Continue with phone button and a Sign in link. Shell: AppShell/Mobile · Phone · Top=Band-Sheet · Bottom=None. Fits: Family / Genealogy, Community, Dating, Social.",
    render: () => <PlatformPhoneApp label="Family stories app" canvas="surface" app={Onboarding} />,
    code: exampleCode(onboarding),
  },
  {
    title: "E5 · AI home",
    description: "The insight first, then your tree: a greeting with the person's photo in Top-Leading, bell and scan in the bar. An AI insight card leads (Accent Solid sparkle, one Primary and one Tertiary action), then the family tree as small Shadow person cards joined by Dividers; the selected person is the Card's Active state. Floating nav with the AI action. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. Fits: AI assistant, Genealogy, Knowledge, Health records.",
    render: () => <PlatformPhoneApp label="Family history app" canvas="default" app={AiHome} />,
    code: exampleCode(aiHome),
  },
  {
    title: "E6 · Discover",
    description: "Large title, intents, AI results: a Heading/1 title with history, a Surface search with voice, four intent tiles (the chosen one Brand Subtle, as Pale fades into the grey canvas), then AI results with Chips in a Shadow card: photo, place, a matched-to line in Accent and an Add to tree Badge. Floating nav with the AI action. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. Fits: AI search, Research, Travel, Library.",
    render: () => <PlatformPhoneApp label="Family history app" canvas="default" app={Discover} />,
    code: exampleCode(discover),
  },
  {
    title: "E7 · Big number",
    description: "One huge value on a Solid band: a Background/Accent/Solid band from the top edge with a week strip (today on White), a White-Overlay Segmented for the view (dark labels on a light track, as Figma draws it), one Display-Extra number and three tiles. A Surface sheet carries the day's updates: a Segmented and a Pale measurement card with range, last reading and status. Shell: AppShell/Mobile · Phone · Top=Band-Sheet · Bottom=Floating. Fits: Health / Nutrition, Fitness, Energy, Budget.",
    render: () => <PlatformPhoneApp label="Nutrition app" canvas="surface" statusBar="light" homeIndicator="dark" app={BigNumber} />,
    code: exampleCode(bigNumber),
  },
]);
