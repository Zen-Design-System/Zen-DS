import { useId } from "react";
import { Accordion, Card, Heading, Stack, Text } from "@zen-ds/react";
import { studio } from "../../data";

/** Questions clients ask in the studio's client portal. */
const clientFaq = [
  { id: "reviews", question: "How do design reviews work?", answer: "Every Friday we share a Figma link and a short walkthrough video. Comment by Tuesday and we fold your notes into the next round; two rounds per milestone are included." },
  { id: "invoices", question: "When are invoices due?", answer: "30 days after we send them. We invoice a milestone only once you approve it, so you never pay for work you haven't seen." },
  { id: "ownership", question: "Who owns the final files?", answer: "You do. When the final invoice is paid we hand over the Figma files, the source code and the font licences in your company's name." },
  { id: "scope", question: "Can we add work mid-project?", answer: "Yes. Your project manager writes up a change request with the extra time and cost, and nothing starts until you approve it." },
];

/** Box theme: a few standalone questions on a client-portal card, each opening on its own; the first starts open. */
export default function ClientFaq() {
  const titleId = useId();
  return (
    // The Box fill (Support/Neutral/Pale) sits on the card's Surface, not straight on the grey page.
    <Card theme="default" as="section" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Working with us</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`${studio.name} client portal`}</Text>
        </Stack>
        <Stack gap="sm" direction="column">
          {clientFaq.map((item, index) => (
            <Accordion key={item.id} theme="box" headingLevel={5} title={item.question} defaultExpanded={index === 0}>
              {item.answer}
            </Accordion>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
