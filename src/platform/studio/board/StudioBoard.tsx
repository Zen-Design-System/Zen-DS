import { useCallback, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Heading, Text } from "../../../components/Text";
import { ExampleCard } from "../../PlatformShowcases";
// From the registry itself: an example edit then hot-updates the board, and Fast Refresh re-renders its frames.
import { getPageExamples } from "../../examples/registry";
import { isWideExample } from "../../examples/types";
import { useHotDataVersion } from "../../hotData";
import { ComponentApi, ComponentKeyboard, ComponentProps } from "../../PlatformReference";
import { ComponentGuidelines } from "../../PlatformGuidelines";
import type { StudioPageParts } from "../bridge";
import { notifyCanvas } from "../canvas/viewport";
import { pageKey, useStudio } from "../store";
import { layoutBoard } from "./boardLayout";
import { DOCS_WIDTH, exampleWidth, FRAME_GAP, playgroundWidth, SECTION_WIDTH } from "./frameLayout";
import { registerSection } from "./frames";
import { StudioFrame } from "./StudioFrame";
import { MainComponentFrame } from "../mainComponent/MainComponentFrame";
import "./board.css";

/** Notes written on the canvas itself (board title): the Studio's own colour mode and type scale, not the preview's. */
function useCanvasNoteModes() {
  const chromeTheme = useStudio((state) => state.chromeTheme);
  return { "data-theme": chromeTheme, "data-typography": "dashboard" } as const;
}

/** A frame of a section: its id (data-studio-frame) and its RULE width (exampleWidth), which fixes its column. */
type SectionFrame = { id: string; width: number };

type SectionLayoutState = {
  observer: ResizeObserver | null;
  observed: Set<HTMLElement>;
  /** Measured heights (world px, fractional as the layout's own), per frame id. */
  heights: Map<string, number>;
  /** Measured rendered widths (a width override renders wider than the rule width the columns use), per frame id. */
  widths: Map<string, number>;
  /** The heights the opening rows were laid out with (boardLayout.ts `base`), per frame id. */
  base: Map<string, number>;
  /** The last left/top written on each frame element. */
  placed: WeakMap<HTMLElement, string>;
  /** Set by the first press or key press: from then on the opening rows stay, only a frame's own column moves. */
  settled: boolean;
  /** The section size last written ("width height"), and one waiting for the next frame (see place). */
  size: string;
  sizeFrame: number;
};

/** A frame's layout height: world px, unscaled by the zoom, as precise as the layout (offsetHeight rounds). */
function frameHeight(element: HTMLElement) {
  const height = Number.parseFloat(getComputedStyle(element).height);
  return Number.isFinite(height) ? height : element.offsetHeight;
}

/**
 * The opening of each page's board (the heights its opening rows were laid out with, and whether that phase ended),
 * kept per page for the session: a remount (a page switch, a reload) with drafted heights then lays the rows out as
 * they opened, not from the drafted heights, so frames in other columns never jump and Undo or Discard restores the
 * board exactly. Mirrored in sessionStorage next to the Studio's other per-session state.
 */
type Opening = { base: Map<string, number>; settled: boolean };
const OPENINGS_KEY = "zen-studio:board-openings";
const openings = new Map<string, Opening>();
let openingsRead = false;

function openingFor(key: string): Opening {
  if (!openingsRead) {
    openingsRead = true;
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(OPENINGS_KEY) ?? "{}") as Record<string, { base?: Record<string, number>; settled?: boolean }>;
      for (const [page, entry] of Object.entries(stored)) {
        const base = new Map(Object.entries(entry?.base ?? {}).filter(([, height]) => Number.isFinite(height)));
        openings.set(page, { base, settled: entry?.settled === true });
      }
    } catch {
      // No storage (private mode) or a malformed entry: the board opens from the measured heights.
    }
  }
  let opening = openings.get(key);
  if (!opening) {
    opening = { base: new Map(), settled: false };
    openings.set(key, opening);
  }
  return opening;
}

let openingsWrite = 0;
function saveOpenings() {
  if (openingsWrite) return;
  openingsWrite = window.setTimeout(() => {
    openingsWrite = 0;
    try {
      const out: Record<string, { base: Record<string, number>; settled: boolean }> = {};
      for (const [page, { base, settled }] of openings) out[page] = { base: Object.fromEntries(base), settled };
      window.sessionStorage.setItem(OPENINGS_KEY, JSON.stringify(out));
    } catch {
      // Storage full or blocked: the in-memory opening still holds for this tab.
    }
  }, 250);
}

function frameElements(container: HTMLElement) {
  const elements = new Map<string, HTMLElement>();
  for (const child of Array.from(container.children)) {
    if (child instanceof HTMLElement && child.dataset.studioFrame) elements.set(child.dataset.studioFrame, child);
  }
  return elements;
}

/**
 * Places a section's frames where boardLayout.ts says (Figma-like: a frame never moves sideways or to another column;
 * a height change moves only the frames below it in its column, by exactly that change; a width override moves
 * nothing). One ResizeObserver watches the frame heights; left/top are written on the frames before the browser paints
 * (offsetLeft/offsetTop stay true for FrameChrome's world boxes), and the section takes the frames' extent. Until the
 * first press or key press the opening rows follow the heights (fonts and late content settle as the flex-wrap row
 * did), so the board opens exactly as before.
 */
function useSectionLayout(containerRef: RefObject<HTMLDivElement | null>, frames: readonly SectionFrame[]) {
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const key = useStudio((state) => pageKey(state.page, state.collection, state.localPage));
  const stateRef = useRef<SectionLayoutState | null>(null);
  const keyRef = useRef(key);
  // The page's opening (base heights, settled) outlives this mount; a page change reads that page's.
  if (!stateRef.current || keyRef.current !== key) {
    const opening = openingFor(key);
    keyRef.current = key;
    stateRef.current = { observer: stateRef.current?.observer ?? null, observed: stateRef.current?.observed ?? new Set(), heights: new Map(), widths: new Map(), base: opening.base, placed: new WeakMap(), settled: opening.settled, size: "", sizeFrame: 0 };
  }

  /** `fromObserver`: called back by the ResizeObserver, where a new section size would resize the section and the world
   * under their own observers (frame chrome, selection) after their turn ("loop completed with undelivered
   * notifications"): the frames move at once, the section follows on the next frame. */
  const place = useCallback((fromObserver = false) => {
    const state = stateRef.current;
    const container = containerRef.current;
    if (!state || !container) return;
    const elements = frameElements(container);
    const list = framesRef.current.filter((frame) => elements.has(frame.id));
    const items = list.map(({ id, width }) => {
      const height = state.heights.get(id) ?? frameHeight(elements.get(id)!);
      if (!state.settled || !state.base.has(id)) {
        if (state.base.get(id) !== height) saveOpenings();
        state.base.set(id, height);
      }
      return { width, height, base: state.base.get(id) ?? height };
    });
    const layout = layoutBoard(items, { rowWidth: SECTION_WIDTH, gap: FRAME_GAP });
    let moved = false;
    list.forEach(({ id }, index) => {
      const element = elements.get(id)!;
      const { x, y } = layout.positions[index];
      const key = `${x},${y}`;
      if (state.placed.get(element) === key) return;
      state.placed.set(element, key);
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      moved = true;
    });
    // A width override renders a frame past the section edge without moving anything (nor the Docs frame beside the
    // section: the grid track keeps the rule extent); the tinted surface reaches the rendered right edge.
    const right = list.reduce((most, { id }, index) => Math.max(most, layout.positions[index].x + (state.widths.get(id) ?? elements.get(id)!.offsetWidth)), layout.width);
    const overflow = Math.max(0, right - layout.width);
    // The section's size, compared as written (the style reads back rounded to 6 digits).
    const size = `${layout.width}px ${layout.height}px ${overflow}px`;
    cancelAnimationFrame(state.sizeFrame);
    state.sizeFrame = 0;
    if (state.size !== size) {
      const resize = () => {
        state.sizeFrame = 0;
        state.size = size;
        container.style.width = `${layout.width}px`;
        container.style.height = `${layout.height}px`;
        container.parentElement?.style.setProperty("--studio-section-overflow", `${overflow}px`);
      };
      if (fromObserver) state.sizeFrame = requestAnimationFrame(resize);
      else resize();
    }
    // Outlines and labels over moved frames follow at once (the selection layer would wait for its mutation throttle).
    if (moved) notifyCanvas();
  }, [containerRef]);

  useLayoutEffect(() => {
    const state = stateRef.current!;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target instanceof HTMLElement ? entry.target.dataset.studioFrame : undefined;
        if (!id) continue;
        const size = entry.borderBoxSize?.[0];
        state.heights.set(id, size ? size.blockSize : entry.contentRect.height);
        state.widths.set(id, size ? size.inlineSize : entry.contentRect.width);
      }
      place(true);
    });
    state.observer = observer;
    state.observed = new Set();
    // The opening phase ends with the first press, key press or wheel (pan / zoom), or once the fonts have loaded and
    // two frames have painted: from then on a height change moves only its own column.
    const settle = (event?: Event) => {
      if (event && !event.isTrusted) return;
      const current = stateRef.current;
      if (current && !current.settled) {
        current.settled = true;
        openingFor(keyRef.current).settled = true;
        saveOpenings();
      }
      stop();
    };
    let settleFrame = 0;
    const stop = () => {
      window.removeEventListener("pointerdown", settle, true);
      window.removeEventListener("keydown", settle, true);
      window.removeEventListener("wheel", settle, true);
      cancelAnimationFrame(settleFrame);
    };
    if (!state.settled) {
      window.addEventListener("pointerdown", settle, true);
      window.addEventListener("keydown", settle, true);
      window.addEventListener("wheel", settle, { capture: true, passive: true });
      void document.fonts?.ready.then(() => {
        settleFrame = requestAnimationFrame(() => { settleFrame = requestAnimationFrame(() => settle()); });
      });
    }
    return () => {
      observer.disconnect();
      state.observer = null;
      cancelAnimationFrame(state.sizeFrame);
      state.sizeFrame = 0;
      stop();
    };
  }, [place]);

  // Every render: the frames there are now (an example added, renamed or remounted) are measured, watched and placed
  // before the browser paints, so no frame ever shows on top of another.
  useLayoutEffect(() => {
    const state = stateRef.current;
    const container = containerRef.current;
    if (!state?.observer || !container) return;
    const elements = frameElements(container);
    for (const [id, element] of elements) {
      state.heights.set(id, frameHeight(element));
      if (!state.observed.has(element)) {
        state.observer.observe(element);
        state.observed.add(element);
      }
    }
    for (const element of state.observed) {
      if (element.parentElement === container) continue;
      state.observer.unobserve(element);
      state.observed.delete(element);
    }
    place();
  });
}

/** A FigJam-like section: a tinted region behind a group of frames; its name tab is drawn by the frame chrome. */
function StudioSection({ id, label, count, frames, children }: { id: string; label: string; count: number; frames: readonly SectionFrame[]; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const framesRef = useRef<HTMLDivElement>(null);
  const noteModes = useCanvasNoteModes();
  useLayoutEffect(() => {
    const element = ref.current;
    return element ? registerSection({ id, label, count, element }) : undefined;
  }, [id, label, count]);
  useSectionLayout(framesRef, frames);
  return (
    <section ref={ref} className="studio-section" aria-label={label} data-studio-section={id}>
      {/* The tinted region belongs to the canvas: the Studio's colour mode, whatever the frames preview. */}
      <div className="studio-section__surface" aria-hidden="true" {...noteModes} />
      <div ref={framesRef} className="studio-section__frames">{children}</div>
    </section>
  );
}

/** A component page laid out as canvas frames: title; the Playground with one frame per example under it; Docs beside them. */
export function StudioBoard({ parts }: { parts: StudioPageParts }) {
  const { page } = parts;
  // An example edit updates the records in place (hotData.ts), so the frames keep their state: render again for the
  // new code and titles.
  useHotDataVersion();
  const examples = useMemo(() => getPageExamples(page), [page]);
  const exampleFrames = useMemo(() => examples.map((example, index) => ({ id: `example:${index}`, width: exampleWidth(example) })), [examples]);
  const noteModes = useCanvasNoteModes();
  return (
    <div className="studio-board" data-page={page}>
      <header className="studio-board__title" {...noteModes}>
        <Text as="p" textStyle="Body/Small/Medium" tone="base">{parts.eyebrow}</Text>
        <Heading level={1} textStyle="Heading/1">{parts.title}</Heading>
        <Text textStyle="Body/Base/Regular" tone="base">{parts.description}</Text>
      </header>
      {/* Grid areas (board.css): Playground with the Examples under it, the Main component (its Figma variant sets) and
          Docs beside both. DOM order stays Playground, Main component, Docs, Examples (the frames list and Tab order). */}
      <StudioFrame id="playground" kind="playground" label="Playground" width={playgroundWidth(page)}>
        <div className="studio-frame__page">{parts.playground}</div>
      </StudioFrame>
      <MainComponentFrame page={page} />
      <StudioFrame id="docs" kind="docs" label="Docs" width={DOCS_WIDTH}>
        <div className="studio-frame__page studio-frame__docs">
          <ComponentKeyboard page={page} />
          <ComponentApi page={page} />
          <ComponentProps page={page} />
          <ComponentGuidelines page={page} />
        </div>
      </StudioFrame>
      {examples.length ? (
        <StudioSection id="examples" label="Examples" count={examples.length} frames={exampleFrames}>
          {/* Keyed by place, not title: renaming an example keeps its frame (and the state of what it shows). */}
          {examples.map((example, index) => (
            <StudioFrame key={`example:${index}`} id={`example:${index}`} kind="example" label={example.title} width={exampleWidth(example)} example={example}>
              <ExampleCard bare title={example.title} description={example.description} code={example.code} wide={isWideExample(example)} screen={example.screen}>{example.render()}</ExampleCard>
            </StudioFrame>
          ))}
        </StudioSection>
      ) : null}
    </div>
  );
}
