import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pagination, paginationItemSizes, paginationThemes, type PaginationItemSize, type PaginationTheme } from "./Pagination";

function Demo({ theme, size }: { theme: PaginationTheme; size: PaginationItemSize }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  return <Pagination theme={theme} size={size} page={page} onPageChange={setPage} pageCount={10} total={480} pageSize={pageSize} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />;
}

const meta = {
  title: "Components/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Pagination (774:29083): Primary/Secondary numbered items (≤7 slots) and Inline/Manually result navigators." } } },
  args: { page: 1, onPageChange: () => {}, theme: "primary", size: "xsmall" },
  argTypes: { theme: { control: "inline-radio", options: paginationThemes }, size: { control: "inline-radio", options: paginationItemSizes } },
  render: (args) => <Demo theme={args.theme ?? "primary"} size={args.size ?? "xsmall"} />,
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24, justifyItems: "start" }}>
      {paginationThemes.map((theme) => <Demo key={theme} theme={theme} size="xsmall" />)}
      <Demo theme="primary" size="small" />
    </div>
  ),
};
