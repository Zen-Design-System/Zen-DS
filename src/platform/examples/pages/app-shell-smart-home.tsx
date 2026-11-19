/* App Shell › Smart home layouts (Figma section F of ◇ Master-Layout · Example, 15991:10067), one docs page of finished
   apps (examples/appShellLayouts.ts). One house runs through F1–F12: Mai Anh's smart-home app. Each example is its own
   file in app-shell-smart-home/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card renders its
   default export, a phone app on the device, and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import SmartHome from "./app-shell-smart-home/f1-home.example";
import f1Home from "./app-shell-smart-home/f1-home.example.tsx?raw";
import LivingRoom from "./app-shell-smart-home/f2-room.example";
import f2Room from "./app-shell-smart-home/f2-room.example.tsx?raw";
import Speaker from "./app-shell-smart-home/f3-speaker.example";
import f3Speaker from "./app-shell-smart-home/f3-speaker.example.tsx?raw";
import RobotVacuum from "./app-shell-smart-home/f4-robot-vacuum.example";
import f4RobotVacuum from "./app-shell-smart-home/f4-robot-vacuum.example.tsx?raw";
import CeilingLight from "./app-shell-smart-home/f5-light.example";
import f5Light from "./app-shell-smart-home/f5-light.example.tsx?raw";
import Climate from "./app-shell-smart-home/f6-climate.example";
import f6Climate from "./app-shell-smart-home/f6-climate.example.tsx?raw";
import FrontCamera from "./app-shell-smart-home/f7-camera.example";
import f7Camera from "./app-shell-smart-home/f7-camera.example.tsx?raw";
import DoorLock from "./app-shell-smart-home/f8-door-lock.example";
import f8DoorLock from "./app-shell-smart-home/f8-door-lock.example.tsx?raw";
import TvRemote from "./app-shell-smart-home/f9-tv.example";
import f9Tv from "./app-shell-smart-home/f9-tv.example.tsx?raw";
import Blinds from "./app-shell-smart-home/f10-blinds.example";
import f10Blinds from "./app-shell-smart-home/f10-blinds.example.tsx?raw";
import Energy from "./app-shell-smart-home/f11-energy.example";
import f11Energy from "./app-shell-smart-home/f11-energy.example.tsx?raw";
import Scenes from "./app-shell-smart-home/f12-scenes.example";
import f12Scenes from "./app-shell-smart-home/f12-scenes.example.tsx?raw";

export const page: PlatformPage = "app-shell-smart-home";

const shell = "Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None.";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "F1 · Home — rooms and devices at a glance",
    description: "Greeting, weather and the house's state, then a room picker and the devices as a two-column grid of Shadow cards: name, brand, a product photo and a power button that stands out while the device is on. Default bottom navigation: Home, Rooms, Scenes, Settings. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. Fits: Smart home, IoT, Building apps.",
    render: () => <PlatformPhoneApp label="Smart home app" canvas="default" app={SmartHome} />,
    code: exampleCode(f1Home),
  },
  {
    title: "F2 · Room — scenes and every device in one list",
    description: "Back and the room name with its device count, quick scene Chips, the room's climate as three small Shadow tiles, then every device in one Shadow box: Dock-Icon (Accent Subtle when on), state and a Toggle-Button. One Primary action adds a device. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: Smart home, Room control.",
    render: () => <PlatformPhoneApp label="Smart home app" canvas="default" app={LivingRoom} />,
    code: exampleCode(f2Room),
  },
  {
    title: "F3 · Speaker — volume, now playing",
    description: "Brand caption and device name, the power Toggle-Button with the battery as a Display value, a large product photo, a volume Slider, the current track and playback controls. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: Speakers, Media.",
    render: () => <PlatformPhoneApp label="Smart home app" canvas="default" app={Speaker} />,
    code: exampleCode(f3Speaker),
  },
  {
    title: "F4 · Robot vacuum — power, modes, map",
    description: "Battery and its warning, the vacuum photo, three mode buttons (Wi-Fi, schedule, quiet) as IconButtons with the active one standing out, a suction Slider, the daily schedule as a Toggle row and Start cleaning. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: Robot vacuum, Appliances.",
    render: () => <PlatformPhoneApp label="Smart home app" canvas="default" app={RobotVacuum} />,
    code: exampleCode(f4RobotVacuum),
  },
  {
    title: "F5 · Light — brightness, warmth, scenes",
    description: `The lamp photo leads, brightness as a large value and Slider, colour temperature as a Segmented (Warm, Neutral, Cool), quick scenes as Chips and a schedule row. ${shell} Fits: Lights, Smart bulbs.`,
    render: () => <PlatformPhoneApp label="Smart home app · Ceiling light" canvas="default" app={CeilingLight} />,
    code: exampleCode(f5Light),
  },
  {
    title: "F6 · Climate — target temperature first",
    description: `Current and target temperature as one Display-Extra value with − and + IconButtons, a Segmented for the mode (Cool, Heat, Fan, Dry), fan speed as a Slider, humidity and air quality as two Metric tiles, and the schedule. ${shell} Fits: Air conditioner, Thermostat.`,
    render: () => <PlatformPhoneApp label="Smart home app · Air conditioner" canvas="default" app={Climate} />,
    code: exampleCode(f6Climate),
  },
  {
    title: "F7 · Camera — live view and events",
    description: `A live porch view with a LIVE Badge, the camera's controls (talk, record, snapshot) as Tertiary IconButtons, then today's events as rows with time and a type Badge. ${shell} Fits: Security camera, Doorbell.`,
    render: () => <PlatformPhoneApp label="Smart home app · Front camera" canvas="default" app={FrontCamera} />,
    code: exampleCode(f7Camera),
  },
  {
    title: "F8 · Door lock — one big lock button",
    description: `The lock state in Display/3 and one big round Accent button to lock or unlock, auto-lock and guest codes as Toggle rows, and the recent access history with people's photos. ${shell} Fits: Smart lock, Access.`,
    render: () => <PlatformPhoneApp label="Smart home app · Front door" canvas="default" app={DoorLock} />,
    code: exampleCode(f8DoorLock),
  },
  {
    title: "F9 · TV — remote on the phone",
    description: "Power and input, the D-pad as a round Surface control with Select in the centre, volume and channel steppers, playback buttons and the apps row as Dock-Icons. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: TV, Media remote.",
    render: () => <PlatformPhoneApp label="Smart home app" canvas="default" app={TvRemote} />,
    code: exampleCode(f9Tv),
  },
  {
    title: "F10 · Blinds — open by percent",
    description: "The window photo with the open level as Display/3, an open-level Slider, Open / Stop / Close buttons and the sunrise and sunset automations as Toggle rows. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: Curtains / Blinds, Shades.",
    render: () => <PlatformPhoneApp label="Smart home app" canvas="default" app={Blinds} />,
    code: exampleCode(f10Blinds),
  },
  {
    title: "F11 · Energy — what uses the power",
    description: "Today's usage as one big kWh number with the change against yesterday, a Day / Week / Month Segmented, this week against last week as a line chart, and smart plugs as Toggle rows with their live watts. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=None. Fits: Energy, Smart plugs.",
    render: () => <PlatformPhoneApp label="Smart home app" canvas="default" app={Energy} />,
    code: exampleCode(f11Energy),
  },
  {
    title: "F12 · Scenes — one tap for many devices",
    description: "Scenes as a grid of cards (Good morning, Leave home, Movie night, Good night) with their device count and a Run button, then automations as List-Items with their trigger and a Toggle-Button. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. Fits: Scenes, Automations.",
    render: () => <PlatformPhoneApp label="Smart home app" canvas="default" app={Scenes} />,
    code: exampleCode(f12Scenes),
  },
]);
