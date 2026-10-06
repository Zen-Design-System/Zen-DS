import { memo, useLayoutEffect, useRef } from "react";
import { OverviewPage } from "../../PlatformApp";
import { PlatformComponentPage, type PlatformPage } from "../../PlatformExamples";
import { PlatformTypographyContext } from "../../PlatformTemplate";
import { navigate, pageTitle } from "../shell/navigation";
import { previewAttributes } from "../shell/modes";
import { pageKey, useStudio } from "../store";
import "./doc.css";

/**
 * Overviews, Installation and the Foundation pages (Design Tokens, Typography, Iconography) are documents, not boards:
 * they read as a normal page that scrolls, with no canvas, zoom or layers (user request, 2026-10-02). The page carries
 * the preview modes like the canvas world, so token and text-style specimens follow the Modes menu.
 */
export const DocumentPage = memo(function DocumentPage({ page, collection }: { page: PlatformPage; collection: string | null }) {
  const preview = useStudio((state) => state.preview);
  const scroller = useRef<HTMLDivElement>(null);
  const key = pageKey(page, collection);
  // A new page starts at the top, as in a browser.
  useLayoutEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [key]);
  const onCollectionClick = (slug: string) => navigate("design-tokens", slug);
  return (
    <div ref={scroller} className="studio-doc" role="region" aria-label={pageTitle(page, collection)} tabIndex={-1}>
      <div className="studio-doc__page" {...previewAttributes(preview)}>
        <PlatformTypographyContext value={preview.typography}>
          {page === "overviews"
            ? <OverviewPage onCardClick={(next) => navigate(next)} />
            : <PlatformComponentPage key={key} page={page} activeCollection={collection} onCollectionClick={onCollectionClick} />}
        </PlatformTypographyContext>
      </div>
    </div>
  );
});
