import { Accordion } from "../../components/Accordion";
import { SheetTable } from "../../components/SheetTable";
import { TableText } from "../../components/Table";
import { typographyStyles } from "../../tokens/typography.generated";
import guidelines from "../guidelines.generated.json";
import { CODE_LANGUAGES, languageCounts, languageRows, type CodeLanguageId } from "./languages";

/*
 * The Installation page's Languages section (plan §3.E): what each Code view language can show today, from the same
 * generated status as the picker. A snippet's "See language status" link lands here (#languages).
 */

const titles = guidelines as Record<string, { title: string }>;

/** A guideline page's parts in one cell: "Ready", "Markup only", "Not yet", or "2 of 5 ready" while a port is partway. */
function pageStatus(rows: typeof languageRows, language: CodeLanguageId) {
  const ready = rows.filter((row) => row[language] === "ready").length;
  const markup = rows.filter((row) => row[language] === "markup").length;
  if (ready === rows.length) return "Ready";
  if (ready + markup === rows.length) return ready ? `${ready} ready, ${markup} markup only` : "Markup only";
  if (!ready && !markup) return "Not yet";
  return `${ready + markup} of ${rows.length} parts`;
}

const bySlug = new Map<string, typeof languageRows>();
for (const row of languageRows) bySlug.set(row.slug, [...(bySlug.get(row.slug) ?? []), row]);
const pages = [...bySlug].map(([slug, rows]) => ({ slug, title: titles[slug]?.title ?? slug, rows })).sort((a, b) => a.title.localeCompare(b.title));

export function LanguagesSection() {
  return (
    <section className="platform-example-panel platform-install__step">
      <h2 id="languages" className={`platform-anchor ${typographyStyles["Heading/4"]}`}>Languages</h2>
      <p className={typographyStyles["Body/Base/Regular"]}>
        React is the reference implementation. Every code view lists the languages below; one shows code for a component once that component works in it, and until then the code view says so.
      </p>
      <SheetTable aria-label="Languages" rows={CODE_LANGUAGES} getRowId={(row) => row.id} minWidth="560px"
        columns={[
          { id: "language", header: "Language", width: "22%", cell: (row) => <TableText>{row.name}</TableText> },
          { id: "components", header: "Components", width: "30%", cell: (row) => {
            const { ready, markup, total } = languageCounts(row.id);
            return <TableText>{ready || markup ? `${ready} of ${total} ready${markup ? `, ${markup} markup only` : ""}` : "Not yet"}</TableText>;
          } },
          { id: "install", header: "Get it", cell: (row) => <TableText>{row.install}</TableText> },
        ]} />
      <Accordion title="Status by component" headingLevel={3} contentWidth="full">
        <SheetTable aria-label="Status by component" rows={pages} getRowId={(row) => row.slug} minWidth="640px"
          columns={[
            { id: "component", header: "Component", width: "22%", cell: (row) => <TableText>{row.title}</TableText> },
            ...CODE_LANGUAGES.map((language) => ({ id: language.id, header: language.label, cell: (row: (typeof pages)[number]) => <TableText>{pageStatus(row.rows, language.id)}</TableText> })),
          ]} />
      </Accordion>
    </section>
  );
}
