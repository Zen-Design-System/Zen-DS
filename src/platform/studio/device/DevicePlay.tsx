import { useEffect, useMemo, useState } from "react";
import { ZenProvider, type ZenBrand } from "../../../components/Provider";
import { Text } from "../../../components/Text";
import { ToastProvider } from "../../../components/Toast";
import { useZen } from "../../../components/_shared/zen-context";
import { rememberUploads } from "../builder/assets/uploads";
import { PlayScreens, usePlayFlow } from "../builder/proto/playFlow";
import { PageOsContext, pageOsOf, ProtoContext, RealDeviceContext } from "../builder/proto/runtime";
import { componentsOf, type LocalComponents, type PageTree } from "../builder/render/renderPage";
import { engineNow, zenComponents } from "../builder/engine";
import { usePageTree } from "../builder/usePageTree";
import { photoBlob, readSharedPage, type SharedPage } from "./sharedPage";
import "./device.css";

/*
 * The phone's side of Open on phone (device.html?t=<share token>, opened from the QR code Play shows): the shared page
 * plays full screen in the phone's own browser, as Play runs it in the Studio (playFlow.tsx), from the Screen Play was on,
 * in Play's modes and the project's theme. The phone draws its own system bars; the Screens pad by its real safe areas
 * (RealDeviceContext). Reload starts again.
 */

const REAL_SAFE = { top: "env(safe-area-inset-top, 0px)", bottom: "env(safe-area-inset-bottom, 0px)" };

export function DevicePlay() {
  const token = new URLSearchParams(window.location.search).get("t") ?? "";
  const [shared, setShared] = useState<SharedPage | { error: string } | null>(null);
  useEffect(() => {
    let live = true;
    void readSharedPage(token).then((page) => {
      if (!live) return;
      if ("text" in page) {
        rememberUploads(page.uploads.map((photo) => ({ id: photo.id, name: photo.name, type: photo.type, blob: photoBlob(photo) })));
        if (page.themeCss) {
          const style = document.createElement("style");
          style.dataset.zenProjectTheme = "";
          style.textContent = page.themeCss;
          document.head.append(style);
        }
        document.title = page.title;
      }
      setShared(page);
    });
    return () => { live = false; };
  }, [token]);
  if (!shared || "error" in shared) {
    return (
      <ZenProvider className="studio-device-play" data-state={shared ? "error" : "loading"}>
        <div className="studio-device-play__message" role={shared ? "alert" : "status"}>
          <Text as="p" textStyle="Body/Base/Regular" tone={shared ? "negative-base" : "base"}>{shared ? shared.error : "Opening the page…"}</Text>
        </div>
      </ZenProvider>
    );
  }
  return <DevicePage page={shared} />;
}

/** The project's pages' components the share carries, by page id (this page's too), for their instances. */
function useSharedLibrary(page: SharedPage, tree: PageTree | null): ReadonlyMap<string, LocalComponents> | undefined {
  return useMemo(() => {
    const engine = engineNow();
    if (!engine || !tree || !page.pages) return undefined;
    const library = new Map<string, LocalComponents>();
    if (page.id) library.set(page.id, componentsOf(tree.board ?? null));
    for (const [id, text] of Object.entries(page.pages)) {
      try { library.set(id, componentsOf((engine.parsePage(text, { components: new Set(zenComponents) }) as unknown as PageTree).board ?? null)); } catch { /* a page that does not parse lends nothing */ }
    }
    return library;
  }, [page, tree]);
}

function DevicePage({ page }: { page: SharedPage }) {
  const tree = usePageTree(page.text);
  const library = useSharedLibrary(page, tree);
  const { modes } = page;
  return (
    <ZenProvider className="studio-device-play" brand={page.brand as ZenBrand} theme={modes.theme} componentTheme={modes.componentTheme} density={modes.density} radius={modes.radius} emphasis={modes.emphasis} contrast={modes.contrast} typography={modes.typography}>
      <ToastProvider placement="bottom-center">
        <DeviceFlow tree={tree} start={page.start} library={library} />
      </ToastProvider>
    </ZenProvider>
  );
}

function DeviceFlow({ tree, start, library }: { tree: PageTree | null; start: string | null; library?: ReadonlyMap<string, LocalComponents> }) {
  // The phone's own breakpoint (ZenProvider auto, the window's width): a Screen with a version drawn for it shows that
  // version (Make a separate Screen, decision D4).
  const flow = usePlayFlow(tree, start, { breakpoint: useZen()?.breakpoint ?? null });
  return (
    <ProtoContext value={flow.actions}>
      <PageOsContext value={pageOsOf(tree?.header)}>
        <RealDeviceContext value>
          <div className="studio-device-play__page" data-screen-id={flow.current}>
            <PlayScreens flow={flow} file="local:shared.zen.tsx" overlaySafe={REAL_SAFE} library={library} />
          </div>
        </RealDeviceContext>
      </PageOsContext>
    </ProtoContext>
  );
}
