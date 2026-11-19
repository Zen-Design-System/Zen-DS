import { ChartCard, FunnelChart, type ChartPoint } from "@zen-ds/react";

/** Q3 2026: from first contact to a signed project (Figma Chart/Funnel-Chart). */
const proposalFunnel: ChartPoint[] = [["Leads", 480], ["Qualified", 312], ["Proposal", 168], ["Negotiation", 94], ["Signed", 62]]
  .map(([label, value]) => ({ label: String(label), value: Number(value) }));

/** Stages from first contact to a signed project, each bar as wide as its share of the first stage. */
export default function ProposalFunnel() {
  return (
    <ChartCard title="Proposal funnel" metricLabel="Leads to signed projects, Q3"
      value={`${proposalFunnel[proposalFunnel.length - 1].value} signed`}>
      <FunnelChart aria-label="Leads to signed projects, Q3 2026" data={proposalFunnel} />
    </ChartCard>
  );
}
