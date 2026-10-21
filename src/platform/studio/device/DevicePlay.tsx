import { useEffect, useState } from "react";
import { ZenProvider, type ZenBrand } from "../../../components/Provider";
import { Text } from "../../../components/Text";
import { ToastProvider } from "../../../components/Toast";
import { rememberUploads } from "../builder/assets/uploads";
import { PlayScreens, usePlayFlow } from "../builder/proto/playFlow";
import { PageOsContext, pageOsOf, ProtoContext, RealDeviceContext } from "../builder/proto/runtime";
import type { PageTree } from "../builder/render/renderPage";
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

function DevicePage({ page }: { page: SharedPage }) {
  const tree = usePageTree(page.text);
  const { modes } = page;
  return (
    <ZenProvider className="studio-device-play" brand={page.brand as ZenBrand} theme={modes.theme} componentTheme={modes.componentTheme} density={modes.density} radius={modes.radius} emphasis={modes.emphasis} contrast={modes.contrast} typography={modes.typography}>
      <ToastProvider placement="bottom-center">
        <DeviceFlow tree={tree} start={page.start} />
      </ToastProvider>
    </ZenProvider>
  );
}

function DeviceFlow({ tree, start }: { tree: PageTree | null; start: string | null }) {
  const flow = usePlayFlow(tree, start);
  return (
    <ProtoContext value={flow.actions}>
      <PageOsContext value={pageOsOf(tree?.header)}>
        <RealDeviceContext value>
          <div className="studio-device-play__page" data-screen-id={flow.current}>
            <PlayScreens flow={flow} file="local:shared.zen.tsx" overlaySafe={REAL_SAFE} />
          </div>
        </RealDeviceContext>
      </PageOsContext>
    </ProtoContext>
  );
}
