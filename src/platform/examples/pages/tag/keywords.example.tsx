import { useId, useState } from "react";
import { AutocompleteField, Card, Heading, Stack, Text } from "@zen-ds/react";
import { projectById } from "../../data";

/** Keywords the studio already uses on its case studies. */
const keywordLibrary = ["Accessibility", "Event website", "Exhibitor map", "Loyalty", "Ticketing", "Volunteers", "Wayfinding"];

/** The case study the keywords belong to: the finished Book Fair site. */
const caseStudy = projectById("bookfair-site");

export default function Keywords() {
  const titleId = useId();
  const [options, setOptions] = useState(keywordLibrary.map((keyword) => ({ id: keyword, label: keyword })));
  const [keywords, setKeywords] = useState(["Event website", "Ticketing", "Accessibility"]);
  return (
    <Card as="section" theme="default" aria-labelledby={titleId}>
      <Stack gap="md" align="stretch">
        <Stack gap="xs" align="stretch">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">{caseStudy.name}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Case study · ${caseStudy.client}`}</Text>
        </Stack>
        <AutocompleteField label="Keywords" addLabel="Add keyword" popoverLabel="Studio keywords" searchPlaceholder="Find or create a keyword"
          helpText="Clients find this case study by its keywords."
          options={options} value={keywords} onValueChange={setKeywords}
          // A new keyword becomes an option and is selected; one that already exists is picked instead of added twice.
          onCreate={(label) => { const keyword = label.trim(); setOptions((list) => [...list, { id: keyword, label: keyword }]); return keyword; }} />
      </Stack>
    </Card>
  );
}
