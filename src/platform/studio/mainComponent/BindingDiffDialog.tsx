import { useState, useSyncExternalStore } from "react";
import { Checkbox } from "../../../components/Checkbox";
import { Dialog } from "../../../components/Dialog";
import { typographyStyles } from "../../../tokens/typography.generated";
import { announceEditStatus, applyCssEdit, studioApi, type BindingProposal } from "../api";
import { refreshDrafts } from "../sourceDrafts";
import "./mainComponent.css";

/*
 * Figma changed a binding → the stylesheet follows (core rebuild Q5(1), spec
 * docs/research/studio-figma-push-spec-2026-10-12.md §3.3). After a Figma re-capture the dev server compares the
 * contracts with the last commit (tools/studio/binding-diff.mjs) and proposes, for each re-bound layer, the component
 * declaration that reads the old variable reading the new one. Listed in Figma's words (variables by name, the layer and
 * how many variants); the certain ones ticked. Apply writes them as drafts (one css-edit each: undo, history, Save and
 * its Figma check as any token edit). Opened from the Main component frame's panel; mounted once with the Studio.
 */

type State = { open: boolean; loading: boolean; error: string | null; changes: number; proposals: BindingProposal[] };
let state: State = { open: false, loading: false, error: null, changes: 0, proposals: [] };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => { state = { ...state, ...next }; listeners.forEach((listener) => listener()); };
const store = { get: () => state, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };

/** Opens the dialog and asks the dev server what Figma re-bound. */
export async function openBindingDiff() {
  set({ open: true, loading: true, error: null, proposals: [], changes: 0 });
  const reply = await studioApi.bindingDiff();
  if (!reply.ok) set({ loading: false, error: reply.error });
  else set({ loading: false, changes: reply.changes, proposals: reply.proposals });
}

const fileName = (file: string) => file.slice(file.lastIndexOf("/") + 1);
const FIELD_WORDS: Record<string, string> = {
  itemSpacing: "gap", paddingLeft: "padding left", paddingRight: "padding right", paddingTop: "padding top", paddingBottom: "padding bottom",
  height: "height", width: "width", topLeftRadius: "corner radius", topRightRadius: "corner radius", bottomLeftRadius: "corner radius", bottomRightRadius: "corner radius",
  fill: "fill", stroke: "stroke", textFill: "text colour", strokeWeight: "stroke weight", opacity: "opacity",
};
const STATUS_WORDS: Record<BindingProposal["status"], string> = { ready: "", manual: "Change it by hand: the value mixes several tokens", "token-missing": "Sync the tokens first: the new variable has no token yet" };

/** One proposal in Figma's words: "Button/Main · 36 variants · Container corner radius: Corner-Radius/Action/Medium → …/Large". */
function describe(proposal: BindingProposal) {
  const first = proposal.because[0];
  const sets = [...new Set(proposal.because.map((why) => why.set))].join(", ");
  const variants = proposal.because.length;
  return {
    title: `${sets} · ${variants} variant${variants === 1 ? "" : "s"} · ${first.layer} ${FIELD_WORDS[first.field] ?? first.field}`,
    change: `${first.from} → ${first.to}`,
  };
}

export function BindingDiffDialog() {
  const shown = useSyncExternalStore(store.subscribe, store.get, store.get);
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const ticked = chosen ?? new Set(shown.proposals.filter((proposal) => proposal.ticked).map((proposal) => proposal.id));
  const ready = shown.proposals.filter((proposal) => proposal.status === "ready" && ticked.has(proposal.id));
  const close = () => { set({ open: false }); setChosen(null); };
  const apply = async () => {
    if (!ready.length || busy) return;
    setBusy(true);
    let applied = 0;
    for (const proposal of ready) {
      const { title } = describe(proposal);
      const result = await applyCssEdit({ file: proposal.file, selector: proposal.selector, media: proposal.media, prop: proposal.prop, value: proposal.to }, `Figma binding: ${title}`);
      if (result.ok) applied += 1;
    }
    setBusy(false);
    void refreshDrafts();
    announceEditStatus({ kind: applied === ready.length ? "saved" : "error", message: `${applied} of ${ready.length} change${ready.length === 1 ? "" : "s"} from Figma's bindings in drafts: Save to keep them`, at: Date.now() });
    close();
  };
  const description = shown.loading ? "Comparing Figma's bindings with the last commit…"
    : shown.error ? shown.error
      : !shown.changes ? "Figma's bindings match the last commit: nothing to follow. Re-capture the contracts after a Figma change (tools/figma-kit), then check again."
        : `${shown.changes} binding change${shown.changes === 1 ? "" : "s"} in Figma; ${shown.proposals.length} stylesheet change${shown.proposals.length === 1 ? "" : "s"} follow. The ticked ones go into drafts.`;
  return (
    <Dialog
      open={shown.open}
      onOpenChange={(open) => { if (!open) close(); }}
      title="Figma bindings"
      description={description}
      icon="ic-figma-line"
      primaryAction={{ label: busy ? "Applying…" : `Apply ${ready.length}`, disabled: !ready.length || busy, onClick: () => { void apply(); } }}
      secondaryAction={{ label: "Close", onClick: close }}
    >
      {shown.proposals.length ? (
        <ul className={`studio-mc__bindings ${typographyStyles["Body/Small/Regular"]}`} aria-label="Stylesheet changes">
          {shown.proposals.map((proposal) => {
            const { title, change } = describe(proposal);
            const note = STATUS_WORDS[proposal.status];
            return (
              <li key={proposal.id} data-status={proposal.status}>
                <Checkbox
                  label={title}
                  caption={`${change} · ${fileName(proposal.file)}${note ? ` · ${note}` : ""}`}
                  checked={ticked.has(proposal.id)}
                  disabled={proposal.status !== "ready" || busy}
                  onCheckedChange={(on) => { const next = new Set(ticked); if (on) next.add(proposal.id); else next.delete(proposal.id); setChosen(next); }}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </Dialog>
  );
}
