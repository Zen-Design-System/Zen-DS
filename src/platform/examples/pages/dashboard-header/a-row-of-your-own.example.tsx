import { useState } from "react";
import { Chip, DashboardHeader, Segmented, Text } from "@zen-ds/react";

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

const periods = [{ id: "week", label: "Week" }, { id: "month", label: "Month" }, { id: "quarter", label: "Quarter" }];
const periodRange: Record<string, string> = { week: "Sep 28 – Oct 4, 2026", month: "Sep 1 – Sep 30, 2026", quarter: "Jul 1 – Sep 30, 2026" };

export default function ReportingPeriod() {
  const [period, setPeriod] = useState("month");
  const [team, setTeam] = useState<string | null>(null);
  return (
    // The row spans the page, between the title row and the report.
    <DashboardHeader type="custom" style={{ width: "100%", minWidth: 0 }}>
      <Segmented aria-label="Reporting period" options={periods} value={period} onValueChange={setPeriod} />
      <Text textStyle="Body/Base/Medium">{periodRange[period]}</Text>
      <FilterChip label="All teams" options={["Design", "Engineering", "Delivery"]} value={team} onChange={setTeam} />
    </DashboardHeader>
  );
}
