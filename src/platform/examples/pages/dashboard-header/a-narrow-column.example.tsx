import { useState } from "react";
import { Box, Button, Chip, DashboardHeader, Search, useToast } from "@zen-ds/react";
import type { LeaveStatus } from "../../data";

const statuses: LeaveStatus[] = ["Pending", "Approved", "Declined"];

/** A filter Chip: Chip Advanced whose Popover picks one value; picked again (or cleared) it shows every row. */
function FilterChip<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T | null; onChange: (next: T | null) => void }) {
  return (
    <Chip variant="advanced" dropdown selected={value !== null} popoverLabel={label}
      popoverItems={options.map((option) => ({ id: option, label: option, selected: value === option }))}
      onPopoverSelect={(item) => onChange(value === item.id ? null : (item.id as T))} onClearSelection={() => onChange(null)}>
      {value ?? label}
    </Chip>
  );
}

export default function NarrowColumn() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LeaveStatus | null>(null);
  return (
    // A 480px column, as beside a Sidebar and a docked panel.
    <Box width="fill" maxWidth={480}>
      <DashboardHeader
        search={<Search size="md" placeholder="Search requests" value={query} onValueChange={setQuery} onClear={() => setQuery("")} />}
        controls={<FilterChip label="Status" options={statuses} value={status} onChange={setStatus} />}
        actions={<Button level="primary" onClick={() => toast({ type: "positive", title: "Leave submitted" })}>Submit leave</Button>}
      />
    </Box>
  );
}
