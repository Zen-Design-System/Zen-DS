import { Table, TableText } from "../components/Table";
import { Heading, Text } from "../components/Text";
import { motionRules, motionTokens, type MotionTokenName } from "../tokens/generated";

type MotionRow = { name: MotionTokenName; css: string; type: string; value: string; reducedMotion?: string; use: string };

const rows: MotionRow[] = (Object.keys(motionTokens) as MotionTokenName[]).map((name) => {
  const token = motionTokens[name] as { css: string; type: string; value: string; reducedMotion?: string; use: string };
  return { name, ...token };
});

/**
 * Motion tokens (code-owned, tokens/source/motion.json): durations, easing curves and the movement factor that reduced
 * motion sets to 0. Figma variables cannot hold easing curves, so code is the source and the Figma Motion collection
 * mirrors the durations.
 */
export function MotionTokens() {
  return (
    <section className="foundation-motion" aria-labelledby="foundation-motion-title">
      <Heading level={2} id="foundation-motion-title">Motion</Heading>
      <Text tone="secondary">Code-owned: durations, easing curves and the movement factor. Reduced motion keeps fades and colour changes and sets the movement to 0, so surfaces crossfade instead of moving.</Text>
      <Table aria-label="Motion tokens" rows={rows} getRowId={(row) => row.name}
        columns={[
          { id: "name", header: "Token", width: "30%", cell: (row) => <TableText bold caption={row.css.replace(/^var\((.*)\)$/, "$1")}>{row.name}</TableText> },
          { id: "value", header: "Value", width: "26%", cell: (row) => <TableText caption={row.reducedMotion !== undefined ? `Reduced motion: ${row.reducedMotion}` : undefined}>{row.value}</TableText> },
          { id: "use", header: "Use", cell: (row) => <TableText>{row.use}</TableText> },
        ]} />
      <ul className="foundation-motion__rules">{motionRules.map((rule) => <li key={rule}><Text>{rule}</Text></li>)}</ul>
    </section>
  );
}
