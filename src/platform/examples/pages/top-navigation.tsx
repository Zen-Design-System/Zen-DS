/* Top Navigation examples. Each example is its own file in top-navigation/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export, a phone app on the device,
   and shows its text as the snippet. */
import { useEffect, useRef, useState } from "react";
import { PlatformPhone, PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import RootAndDetail from "./top-navigation/root-and-detail.example";
import rootAndDetail from "./top-navigation/root-and-detail.example.tsx?raw";
import CollapseOnScroll from "./top-navigation/collapse-on-scroll.example";
import collapseOnScroll from "./top-navigation/collapse-on-scroll.example.tsx?raw";
import HomeWithNotifications from "./top-navigation/home-with-notifications.example";
import homeWithNotifications from "./top-navigation/home-with-notifications.example.tsx?raw";
import InboxControlBar from "./top-navigation/inbox-control-bar.example";
import inboxControlBar from "./top-navigation/inbox-control-bar.example.tsx?raw";
import ConversationHeader from "./top-navigation/conversation-header.example";
import conversationHeader from "./top-navigation/conversation-header.example.tsx?raw";
import OverPhotos from "./top-navigation/over-photos.example";
import overPhotos from "./top-navigation/over-photos.example.tsx?raw";
import ModalScreen from "./top-navigation/modal-screen.example";
import modalScreen from "./top-navigation/modal-screen.example.tsx?raw";
import TitleMenu from "./top-navigation/title-menu.example";
import titleMenu from "./top-navigation/title-menu.example.tsx?raw";
import LargeTitleWithBadges from "./top-navigation/large-title-with-badges.example";
import largeTitleWithBadges from "./top-navigation/large-title-with-badges.example.tsx?raw";
import HeroHeader from "./top-navigation/hero-header.example";
import heroHeader from "./top-navigation/hero-header.example.tsx?raw";
import SelectionMode from "./top-navigation/selection-mode.example";
import selectionMode from "./top-navigation/selection-mode.example.tsx?raw";

export const page: PlatformPage = "top-navigation";

/** Over photos on the device: the photo viewer is a media screen, so the status bar and home indicator turn light while
 *  it shows (in an app, its status bar style); the moodboard keeps them dark. Docs chrome, not part of the example. */
function OverPhotosPhone({ app: App }: { app: typeof OverPhotos }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [media, setMedia] = useState(false);
  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return undefined;
    const update = () => setMedia(Boolean(screen.querySelector('.zen-top-nav[data-type="liquid-overlay"]')));
    update();
    const observer = new MutationObserver(update);
    observer.observe(screen, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return (
    <PlatformPhone label="Moodboard" statusBar={media ? "light" : "dark"} screenRef={screenRef}>
      <App scrollRef={screenRef} />
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Root and detail",
    description: "A tab root names itself with the large title, its h1, which folds into the bar as the list scrolls. A project opens a dense detail screen in the Compact type: its bar title becomes the h1, its actions are Flat, and the chevron Back returns focus to the row you came from.",
    render: () => <PlatformPhoneApp label="Projects" app={RootAndDetail} />,
    code: exampleCode(rootAndDetail),
  },
  {
    title: "Collapse on scroll",
    description: "With scrollRef the large title and the Search slide under the bar with the list, and the bar title fades in. While folded, Search waits as a top-right action that scrolls back up and focuses the field.",
    render: () => <PlatformPhoneApp label="People" app={CollapseOnScroll} />,
    code: exampleCode(collapseOnScroll),
  },
  {
    title: "Home with notifications",
    description: "On an Alt canvas the bar takes the Alt type and folds like any root. The leading slot shows the account, and a dot on the bell marks unread notifications; its label carries the count, and both clear once the sheet opens.",
    render: () => <PlatformPhoneApp label="Home" app={HomeWithNotifications} />,
    code: exampleCode(homeWithNotifications),
  },
  {
    title: "Inbox control bar",
    description: "A full-width Segmented in the control bar switches All and Unread and counts what is unread; it stays pinned while the large title folds. Mark all as read stays in place but disabled once nothing is left, and an empty Unread view offers a way back.",
    render: () => <PlatformPhoneApp label="Inbox" app={InboxControlBar} />,
    code: exampleCode(inboxControlBar),
  },
  {
    title: "Conversation header",
    description: "The identity header puts the person or group in the bar: avatar, name and presence, one button that opens their profile. Audio and video calls share one pill, each half with its own label; a call rings in the thread, then turns into a missed call with Call again.",
    render: () => <PlatformPhoneApp label="Messages" app={ConversationHeader} />,
    code: exampleCode(conversationHeader),
  },
  {
    title: "Over photos",
    description: "A photo viewer uses the Liquid Overlay type: its dark gradient keeps the white title and actions readable on any picture. Close returns to the tile you opened, and the heart swaps to solid with its label.",
    render: () => <OverPhotosPhone app={OverPhotos} />,
    code: exampleCode(overPhotos),
  },
  {
    title: "Modal screen",
    description: "A create screen opens as a modal: Compact bar titled with the task, Close on the leading edge and the Primary in an ActionBar footer, never in the bar. Close asks before it drops a draft, and Book review checks the fields first.",
    render: () => <PlatformPhoneApp label="Reviews" app={ModalScreen} />,
    code: exampleCode(modalScreen),
  },
  {
    title: "Title menu",
    description: "Figma Heading-Text Dropdown: the bar title is a button with a chevron that opens a menu, here of mailboxes with their unread counts. The title still names the screen; picking a mailbox renames it.",
    render: () => <PlatformPhone label="Mail"><TitleMenu /></PlatformPhone>,
    code: exampleCode(titleMenu),
  },
  {
    title: "Large title with badges",
    description: "Figma Main-Heading-Text Badges: a row of Badges under the large title and its subheading, for what the screen's state is at a glance. They fold away with the large title; a Badge beside the title goes in largeTitleAction instead.",
    render: () => <PlatformPhone label="Living room"><LargeTitleWithBadges /></PlatformPhone>,
    code: exampleCode(largeTitleWithBadges),
  },
  {
    title: "Hero header",
    description: "Over a hero photo the bar takes the Default-Overlay type (a dark gradient under a white title and Liquid Glass actions, readable on any photo); with scrolledType it becomes the Default bar once the page scrolls under it, as iOS's scroll-edge and standard appearances. The change is a colour fade.",
    render: () => <PlatformPhoneApp label="Saola Lodge" app={HeroHeader} />,
    code: exampleCode(heroHeader),
  },
  {
    title: "Selection mode",
    description: "A recipe from the props TopNavigation already has: Select swaps the bar for a selection bar, Cancel on the left, the count as its title, and the actions for the selection on the right (dimmed until something is picked). Rows toggle with a check while it is on.",
    render: () => <PlatformPhone label="Files"><SelectionMode /></PlatformPhone>,
    code: exampleCode(selectionMode),
  },
]);
