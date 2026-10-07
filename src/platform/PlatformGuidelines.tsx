import { useContext } from "react";
import { Icon } from "../components/Icon";
import { typographyStyles } from "../tokens/typography.generated";
import guidelinesData from "./guidelines.generated.json";
import { guidelineVisuals, type GuidelineExample } from "./PlatformGuidelineVisuals";
import type { PlatformPage } from "./PlatformExamples";
import { PlatformTypographyContext } from "./PlatformTemplate";

/* Usage guidelines on each component page. Text comes from tools/usage-guard/guidelines.source.mjs
 * (npm run guidelines:build) — the same source as docs/guidelines/*.md and the harness — and the
 * visual Do/Don't pairs render real components from PlatformGuidelineVisuals.tsx. */

type Rule = { id: string; severity: "error" | "warn"; summary: string; allow: string };
type Guideline = { title: string; purpose: string; use: string[]; avoid: string[]; do: string[]; dont: string[]; a11y: string[]; content: string[]; refs: [string, string][]; file: string; rules: Rule[] };
const guidelines = guidelinesData as unknown as Record<string, Guideline>;

/** Platform page id → guideline slug (most are identical). */
const slugFor: Partial<Record<PlatformPage, string>> = { iconography: "icon", "design-tokens": "borders" };
/** Guideline slug for a platform page (shared with the Keyboard/API reference sections). */
export const guidelineSlugFor = (page: PlatformPage) => slugFor[page] ?? page;

/** Render `inline code` and "<Tag>" spans from the plain-text guideline strings. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|<\/?[A-Za-z][\w.-]*>)/g).filter(Boolean);
  return <>{parts.map((part, index) => part.startsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part.startsWith("<") ? <code key={index}>{part}</code> : part)}</>;
}

function Verdict({ kind }: { kind: "do" | "dont" }) {
  return <span className={`pg-verdict ${typographyStyles["Body/Small/Bold"]}`} data-kind={kind}><Icon name={kind === "do" ? "icon-check-circle-solid" : "icon-x-circle-solid"} size="sm" decorative />{kind === "do" ? "Do" : "Don't"}</span>;
}

function Example({ kind, example }: { kind: "do" | "dont"; example: GuidelineExample }) {
  // The Do/Don't stage renders real components, so it takes the preview typography (Dashboard by default, the topbar
  // chip) — never the shell's Zen-Platform overrides, which turned a TopNavigation Heading/1 into TASA Explorer.
  const typography = useContext(PlatformTypographyContext);
  return (
    <figure className="pg-example" data-kind={kind}>
      {/* Illustrations only: inert keeps demo controls out of the tab order and screen-reader flow. */}
      <div className="pg-example__stage" inert data-typography={typography}>{example.preview}</div>
      <figcaption className="pg-example__caption">
        <Verdict kind={kind} />
        <span className={typographyStyles["Body/Small/Regular"]}>{example.caption}</span>
      </figcaption>
    </figure>
  );
}

/** "Choosing a filter → Chip (…)" renders the recommended component emphasised. */
function Alternative({ text }: { text: string }) {
  const [situation, target] = text.split(/\s*→\s*/);
  return target
    ? <><span className="pg-muted"><RichText text={situation} /></span><span className="pg-arrow" aria-hidden="true">→</span><strong className="pg-target"><RichText text={target} /></strong></>
    : <RichText text={text} />;
}

export function ComponentGuidelines({ page, title = "Usage guidelines", slug: slugOverride }: { page: PlatformPage; title?: string; slug?: string }) {
  const slug = slugOverride ?? slugFor[page] ?? page;
  const guideline = guidelines[slug];
  if (!guideline) return null;
  const pairs = guidelineVisuals[slug] ?? [];
  const headingId = `pg-${slug}-guidelines`;
  return (
    <section className="pg" aria-labelledby={headingId}>
      <header className="pg-head">
        <h2 id={headingId} className={typographyStyles["Heading/3"]}>{title}</h2>
        <p className={`pg-muted ${typographyStyles["Body/Base/Regular"]}`}><RichText text={guideline.purpose} /></p>
      </header>

      <div className="pg-when">
        <div className="pg-when__col">
          <h3 className={typographyStyles["Body/Small/Bold"]}>When to use</h3>
          <ul className={typographyStyles["Body/Base/Regular"]}>{guideline.use.map((item) => <li key={item}><RichText text={item} /></li>)}</ul>
        </div>
        <div className="pg-when__col">
          <h3 className={typographyStyles["Body/Small/Bold"]}>When to use something else</h3>
          <ul className={typographyStyles["Body/Base/Regular"]}>{guideline.avoid.map((item) => <li key={item}><Alternative text={item} /></li>)}</ul>
        </div>
      </div>

      {pairs.length ? (
        <div className="pg-pairs">
          {pairs.map((pair, index) => (
            <div className="pg-pair" key={index}>
              <Example kind="do" example={pair.do} />
              <Example kind="dont" example={pair.dont} />
            </div>
          ))}
        </div>
      ) : null}

      <div className="pg-checklist">
        {(["do", "dont"] as const).map((kind) => (
          <div className="pg-checklist__col" data-kind={kind} key={kind}>
            <Verdict kind={kind} />
            <ul>
              {guideline[kind].map((item) => (
                <li key={item} className={typographyStyles["Body/Base/Regular"]}>
                  <Icon name={kind === "do" ? "icon-check-line" : "icon-x-small-line"} size="sm" decorative />
                  <span><RichText text={kind === "dont" ? item.replace(/^Don't (\w)/, (_, c: string) => c.toUpperCase()) : item} /></span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="pg-meta">
        <div>
          <h3 className={typographyStyles["Body/Small/Bold"]}>Accessibility</h3>
          <ul className={typographyStyles["Body/Small/Regular"]}>{[...guideline.a11y, ...guideline.content].map((item) => <li key={item}><RichText text={item} /></li>)}</ul>
        </div>
        <div>
          <h3 className={typographyStyles["Body/Small/Bold"]}>Harness · <code>npm run usage:check</code></h3>
          {guideline.rules.length ? (
            <ul className={`pg-rules ${typographyStyles["Body/Small/Regular"]}`}>
              {guideline.rules.map((rule) => (
                <li key={rule.id}>
                  <span className="pg-rules__dot" data-severity={rule.severity} title={rule.severity} aria-label={rule.severity} />
                  <span><code>{rule.id}</code> <span className="pg-muted">{rule.summary}</span></span>
                </li>
              ))}
            </ul>
          ) : <p className={`pg-muted ${typographyStyles["Body/Small/Regular"]}`}>No machine-checkable rules yet.</p>}
        </div>
        <div>
          <h3 className={typographyStyles["Body/Small/Bold"]}>References</h3>
          <ul className={`pg-refs ${typographyStyles["Body/Small/Regular"]}`}>
            {guideline.refs.map(([name, url]) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{name}<Icon name="icon-arrow-up-right-line" size="xs" decorative /></a></li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
