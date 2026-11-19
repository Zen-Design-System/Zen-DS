import { useId } from "react";
import { Heading, SheetCode, SheetTable, Stack, TableText, Text } from "@zen-ds/react";

/* A component with no props of its own yet: the reference keeps its header and says why there are no rows. */
type Prop = { name: string; description: string };

export default function NoProps() {
  const titleId = useId();
  return (
    <Stack as="section" gap="md" aria-labelledby={titleId}>
      <Heading level={2} id={titleId} textStyle="Heading/4">VisuallyHidden props</Heading>
      <SheetTable aria-labelledby={titleId} rows={[] as Prop[]} getRowId={(row) => row.name}
        empty={<Text textStyle="Body/Base/Regular" tone="base">VisuallyHidden has no props of its own: it takes its children and the attributes of a span.</Text>}
        columns={[
          { id: "prop", header: "Prop", width: "18%", cell: (row) => <SheetCode>{row.name}</SheetCode> },
          { id: "description", header: "Description", cell: (row) => <TableText>{row.description}</TableText> },
        ]} />
    </Stack>
  );
}
