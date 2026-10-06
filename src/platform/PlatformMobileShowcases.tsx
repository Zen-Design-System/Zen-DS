import { SidePanel } from "../components/SidePanel";
import { Table, TableText } from "../components/Table";

/** Chart Card "Open report" (the header chevron): a modal Side Panel with the numbers behind the chart. */
export function ChartReportPanel({ open, onOpenChange, title, description, head, rows, total }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Headers of the label column and the value column. */
  head: [string, string];
  rows: Array<[string, string]>;
  /** A last row in bold, e.g. ["Total", "$78,000"]. */
  total?: [string, string];
}) {
  const lines = [...rows.map(([label, value]) => ({ id: label, label, value, bold: false })), ...(total ? [{ id: "total", label: total[0], value: total[1], bold: true }] : [])];
  return (
    <SidePanel open={open} onOpenChange={onOpenChange} type="modal" title={title} description={description}>
      <Table aria-label={title} rows={lines}
        columns={[
          { id: "label", header: head[0], cell: (row) => <TableText bold={row.bold}>{row.label}</TableText> },
          { id: "value", header: head[1], align: "right", cell: (row) => <TableText bold={row.bold}>{row.value}</TableText> },
        ]} />
    </SidePanel>
  );
}

