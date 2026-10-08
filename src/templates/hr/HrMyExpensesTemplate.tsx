/**
 * Template: HR · Expenses › My expenses. The signed-in person's own expense claims:
 * - Three totals: what waits for approval, what is approved and not paid yet, and what was paid this quarter.
 * - Every claim in a Table on a Surface card, with Search, Status and Category filter chips and sortable Date and
 *   Amount columns. On a phone the claims become a List, and the chips (plus Sort) open Bottom Sheets.
 * - A row opens the claim in a Side Panel: amount and status, the facts, the receipt and the approval progress, with the
 *   actions its status allows (submit or delete a draft, withdraw a submitted claim, fix and resubmit a rejected one).
 *   A change acts at once, closes the panel and offers Undo in a Toast.
 * - New expense opens a validated ModalForm with a receipt upload; the claim lands in the table and the totals.
 *
 * Copy it with ./HrShell, ./data and ./assets into your app and replace the sample data. Render it inside your app's
 * <ZenProvider>. Uses only @zen-ds/react components, no custom CSS.
 */
import { useMemo, useState } from "react";
import {
  Badge,
  BottomSheet,
  Button,
  Chip,
  Container,
  DateField,
  DescriptionList,
  DockIcon,
  EmptyState,
  FileIcon,
  FileUpload,
  Grid,
  Heading,
  Icon,
  IconButton,
  InlineMessage,
  InputField,
  List,
  ListItem,
  Metric,
  MetricCard,
  ModalForm,
  PageHeader,
  plural,
  Search,
  SelectField,
  SidePanel,
  Stack,
  Stepper,
  Table,
  TableBadges,
  TableMedia,
  TableText,
  Text,
  TextAreaField,
  Thumbnail,
  fileIconFormatOf,
  useFormState,
  useToast,
  useZen,
  type DockIconTheme,
  type IconName,
  type StepperStep,
  type TableSort,
  type UploaderFile,
} from "@zen-ds/react";
import { HrShell, hrModules, type HrNavigate } from "./HrShell";
import {
  claimStatuses,
  claimStatusTheme,
  currentUser,
  expenseCategories,
  expenseCategoryList,
  expenseClaims,
  formatDate,
  formatMoney,
  formatRelative,
  now,
  people,
  toDate,
  toIsoDay,
  today,
  type ClaimStatus,
  type ExpenseCategoryId,
  type ExpenseClaim,
} from "./data";

/* ── Data: the signed-in person's claims; their manager approves them ─────────────────────────────────────────── */
const myClaims = expenseClaims.filter((claim) => claim.person === currentUser.id);
const approver = people[currentUser.manager ?? currentUser.id];
/** "Paid this quarter" counts payouts from the first day of the current quarter. */
const quarterStart = (() => { const day = toDate(today); return toIsoDay(new Date(day.getFullYear(), Math.floor(day.getMonth() / 3) * 3, 1)); })();
/** Claim numbers continue from the highest one in the workspace (EXP-1053 next). */
const numberOf = (claim: ExpenseClaim) => Number(claim.id.replace("EXP-", ""));
const lastClaimNumber = Math.max(...expenseClaims.map(numberOf));

/** The totals above the table, coloured like their status Badges. */
const tiles: Array<{ status: ClaimStatus; label: string; icon: IconName; theme: DockIconTheme }> = [
  { status: "Submitted", label: "Submitted", icon: "icon-hourglass-solid", theme: "yellow" },
  { status: "Approved", label: "Approved", icon: "icon-check-circle-solid", theme: "blue" },
  { status: "Paid", label: "Paid this quarter", icon: "icon-coins-hand-solid", theme: "green" },
];

type FilterOption = { id: string; label: string; leading?: IconName };
const statusOptions: FilterOption[] = claimStatuses.map((status) => ({ id: status, label: status }));
const categoryOptions: FilterOption[] = expenseCategoryList.map((category) => ({ id: category.id, label: category.name, leading: category.icon }));

/** Date and Amount sort in the Table headers; on a phone the same four orders sit in a Sort sheet. */
const sorters: Record<string, (a: ExpenseClaim, b: ExpenseClaim) => number> = {
  spent: (a, b) => a.spent.localeCompare(b.spent),
  amount: (a, b) => a.amount - b.amount,
};
const defaultSort: TableSort = { columnId: "spent", direction: "desc" };
const sortChoices: Array<{ id: string; label: string; sort: TableSort }> = [
  { id: "spent-desc", label: "Newest first", sort: defaultSort },
  { id: "spent-asc", label: "Oldest first", sort: { columnId: "spent", direction: "asc" } },
  { id: "amount-desc", label: "Highest amount", sort: { columnId: "amount", direction: "desc" } },
  { id: "amount-asc", label: "Lowest amount", sort: { columnId: "amount", direction: "asc" } },
];

/* ── Form helpers: DateField speaks MM/DD/YYYY, the data ISO days; amounts are typed as text ─────────────────── */
type ExpenseValues = { title: string; merchant: string; amount: string; category: string; spent: string; note: string; receipt: string };
const pad = (value: number) => String(value).padStart(2, "0");
const toFieldDate = (day: string) => { const date = toDate(day); return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`; };
const fromFieldDate = (text: string) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getMonth() === Number(match[1]) - 1 ? toIsoDay(date) : null;
};
const parseAmount = (text: string) => { const clean = text.replace(/[$,\s]/g, ""); return /^\d+(\.\d{1,2})?$/.test(clean) ? Number(clean) : Number.NaN; };
const fileSize = (bytes: number) => (bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`);
const maxReceiptBytes = 10_000_000;
const blankExpense: ExpenseValues = { title: "", merchant: "", amount: "", category: "", spent: toFieldDate(today), note: "", receipt: "" };
const valuesOf = (claim: ExpenseClaim): ExpenseValues => ({
  title: claim.title, merchant: claim.merchant, amount: claim.amount.toFixed(2), category: claim.category, spent: toFieldDate(claim.spent), note: claim.note ?? "", receipt: claim.receipt ?? "",
});

/** The approval progress of a claim: submitted → approved (or rejected) → paid. */
function progressOf(claim: ExpenseClaim): { steps: StepperStep[]; current: number } {
  const submitted: StepperStep = { id: "submitted", title: "Submitted", caption: claim.submitted ? formatRelative(claim.submitted) : "Not submitted yet" };
  const decided = claim.decided ? `${approver.name} · ${formatRelative(claim.decided)}` : undefined;
  if (claim.status === "Rejected") return { steps: [submitted, { id: "rejected", title: "Rejected", caption: decided, error: true }], current: 1 };
  const steps: StepperStep[] = [
    submitted,
    { id: "approved", title: "Approved", caption: decided ?? (claim.status === "Submitted" ? `Waiting for ${approver.name}` : approver.name) },
    { id: "paid", title: "Paid", caption: claim.paid ? formatDate(claim.paid) : "With the next payout" },
  ];
  return { steps, current: { Draft: 0, Submitted: 1, Approved: 2, Paid: 3 }[claim.status] };
}

export function HrMyExpensesTemplate() {
  const { toast, dismiss } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const [claims, setClaims] = useState(myClaims);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<TableSort | null>(defaultSort);
  const [sheet, setSheet] = useState<"status" | "category" | "sort" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  // The form either creates a claim (null) or fixes a rejected one and sends it again (its id).
  const [form, setForm] = useState<{ editing: string | null } | null>(null);
  const [receiptFile, setReceiptFile] = useState<UploaderFile | null>(null);
  // Photos picked in this session keep a preview for the claim's receipt thumbnail.
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = claims.filter((claim) =>
      (!q || [claim.title, claim.merchant, claim.id, expenseCategories[claim.category].name].some((text) => text.toLowerCase().includes(q)))
      && (!statusFilter.length || statusFilter.includes(claim.status))
      && (!categoryFilter.length || categoryFilter.includes(claim.category)));
    if (!sort) return list;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => sorters[sort.columnId](a, b) * direction);
  }, [claims, query, statusFilter, categoryFilter, sort]);

  // Open totals per status; Paid only counts this quarter's payouts.
  const totals = tiles.map((tile) => {
    const list = claims.filter((claim) => claim.status === tile.status && (tile.status !== "Paid" || (claim.paid ?? "") >= quarterStart));
    return { ...tile, count: list.length, sum: list.reduce((sum, claim) => sum + claim.amount, 0) };
  });
  const opened = claims.find((claim) => claim.id === openId) ?? null;
  const activeFilters = (query.trim() ? 1 : 0) + (statusFilter.length ? 1 : 0) + (categoryFilter.length ? 1 : 0);
  const clearFilters = () => { setQuery(""); setStatusFilter([]); setCategoryFilter([]); };
  const sortChoice = sortChoices.find((choice) => choice.sort.columnId === sort?.columnId && choice.sort.direction === sort?.direction) ?? sortChoices[0];

  const navigate: HrNavigate = (target) => {
    if (target.module === "expenses" && target.page === "my-expenses") return;
    if (target.module === "home") { toast({ title: "Home isn't part of this demo" }); return; }
    const { title, sections } = hrModules[target.module];
    const pages = sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]));
    const page = pages.find((item) => item.id === (target.page ?? pages[0]?.id));
    toast({ title: `${page?.label ?? title} isn't part of this demo` });
  };

  /* ── Claim actions: each change shows at once and closes the panel (its actions change with the status); the Toast
     offers Undo, which also closes it ── */
  const update = (id: string, patch: Partial<ExpenseClaim>) => setClaims((list) => list.map((claim) => (claim.id === id ? { ...claim, ...patch } : claim)));
  const undoable = (title: string, children: string, undo: () => void) => {
    const toastId = toast({ title, children, action: { label: "Undo", onClick: () => { undo(); dismiss(toastId); } } });
  };
  const submitDraft = (claim: ExpenseClaim) => {
    update(claim.id, { status: "Submitted", submitted: now });
    setOpenId(null);
    undoable("Expense submitted", `Sent to ${approver.name} for approval`, () => update(claim.id, { status: claim.status, submitted: claim.submitted }));
  };
  const withdraw = (claim: ExpenseClaim) => {
    update(claim.id, { status: "Draft", submitted: undefined });
    setOpenId(null);
    undoable("Expense withdrawn", `${claim.id} is a draft again`, () => update(claim.id, { status: claim.status, submitted: claim.submitted }));
  };
  const deleteDraft = (claim: ExpenseClaim) => {
    const index = claims.findIndex((item) => item.id === claim.id);
    setClaims((list) => list.filter((item) => item.id !== claim.id));
    setOpenId(null);
    undoable("Draft deleted", claim.title, () => setClaims((list) => [...list.slice(0, index), claim, ...list.slice(index)]));
  };

  /* ── New expense, or a rejected claim fixed and sent again ── */
  const expense = useFormState({
    initialValues: blankExpense,
    validate: (values) => {
      const amount = parseAmount(values.amount);
      const category = values.category ? expenseCategories[values.category as ExpenseCategoryId] : undefined;
      const spent = fromFieldDate(values.spent);
      return {
        ...(values.title.trim() ? {} : { title: "Describe the expense, like Taxi to the client workshop" }),
        ...(values.merchant.trim() ? {} : { merchant: "Enter the merchant, like Grab" }),
        ...(!(amount > 0) ? { amount: "Enter the amount, like 42.50" }
          : category?.limit && amount > category.limit ? { amount: `Enter ${formatMoney(category.limit, { cents: false })} or less, the ${category.name} limit` } : {}),
        ...(category ? {} : { category: "Choose a category" }),
        ...(!spent ? { spent: "Enter the date as MM/DD/YYYY" } : spent > today ? { spent: "Pick today or an earlier day" } : {}),
        ...(values.receipt ? {} : { receipt: "Add a photo or PDF of the receipt" }),
      };
    },
    onSubmit: (values) => {
      const editing = form?.editing ?? null;
      const id = editing ?? `EXP-${Math.max(lastClaimNumber, ...claims.map(numberOf)) + 1}`;
      const amount = parseAmount(values.amount);
      const claim: ExpenseClaim = {
        id, person: currentUser.id, title: values.title.trim(), merchant: values.merchant.trim(), category: values.category as ExpenseCategoryId,
        amount, spent: fromFieldDate(values.spent) ?? today, submitted: now, status: "Submitted", approver: approver.id, receipt: values.receipt, note: values.note.trim() || undefined,
      };
      setClaims((list) => (editing ? list.map((item) => (item.id === editing ? claim : item)) : [claim, ...list]));
      if (receiptFile?.previewUrl) { const url = receiptFile.previewUrl; setPreviews((map) => ({ ...map, [id]: url })); }
      setForm(null);
      const toastId = toast({
        title: editing ? "Expense resubmitted" : "Expense submitted",
        children: `${formatMoney(amount)} sent to ${approver.name} for approval`,
        action: { label: "View", onClick: () => { dismiss(toastId); setOpenId(id); } },
      });
    },
  });
  const startExpense = (claim?: ExpenseClaim) => {
    expense.reset(claim ? valuesOf(claim) : blankExpense);
    setReceiptFile(claim?.receipt ? { id: claim.receipt, name: claim.receipt, state: "uploaded", previewUrl: previews[claim.id] } : null);
    setOpenId(null);
    setForm({ editing: claim?.id ?? null });
  };
  const addReceipt = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const problem = !/\.(jpe?g|png|pdf)$/i.test(file.name) ? "Use a JPG, PNG or PDF file" : file.size > maxReceiptBytes ? "Choose a file under 10 MB" : undefined;
    if (problem) { setReceiptFile(null); expense.setValue("receipt", "", { touch: true }); expense.setError("receipt", problem); return; }
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    setReceiptFile({ id: `${file.name}-${file.lastModified}`, name: file.name, size: fileSize(file.size), state: "uploaded", previewUrl });
    expense.setValue("receipt", file.name, { touch: true });
  };
  const pickedCategory = expense.values.category ? expenseCategories[expense.values.category as ExpenseCategoryId] : undefined;

  /* ── Filters: Chip popovers on a desktop; on a phone each chip opens a Bottom Sheet with the same choices ── */
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const filters = {
    status: { label: "Status", options: statusOptions, picked: statusFilter, setPicked: setStatusFilter },
    category: { label: "Category", options: categoryOptions, picked: categoryFilter, setPicked: setCategoryFilter },
  };
  const filterChip = (id: keyof typeof filters) => {
    const { label, options, picked, setPicked } = filters[id];
    const shared = {
      variant: "advanced", size: "md", dropdown: true, selectionMode: "multiple", selected: picked.length > 0, selectionCount: picked.length, onClearSelection: () => setPicked([]),
    } as const;
    const chipLabel = picked.length === 1 ? options.find((option) => option.id === picked[0])?.label : label;
    return phone
      ? <Chip key={id} {...shared} aria-haspopup="dialog" aria-expanded={sheet === id} onClick={() => setSheet(id)}>{chipLabel}</Chip>
      : (
        <Chip key={id} {...shared} popoverMultiple popoverLabel={label} popoverItems={options.map((option) => ({ ...option, selected: picked.includes(option.id) }))}
          onPopoverSelect={(item) => setPicked(toggle(picked, item.id))}>{chipLabel}</Chip>
      );
  };
  const sheetFilter = sheet === "status" || sheet === "category" ? filters[sheet] : null;
  const check = <Icon name="icon-check-line" size="base" decorative />;

  const emptyState = !claims.length
    ? <EmptyState title="No expenses yet" headingLevel={2} illustration={false} icon="icon-receipt-line" primaryAction={{ label: "New expense", onClick: () => startExpense() }}>Add a work cost you paid yourself to get it back.</EmptyState>
    : statusFilter.length || categoryFilter.length || !query.trim()
      ? <EmptyState title="No expenses match" headingLevel={2} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>Try another status or category.</EmptyState>
      : <EmptyState title={`No results for “${query.trim()}”`} headingLevel={2} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>Search by description, merchant or expense number.</EmptyState>;

  const panel = opened ? (() => {
    const category = expenseCategories[opened.category];
    const { steps, current } = progressOf(opened);
    const preview = previews[opened.id];
    // Only a draft, a submitted claim and a rejected one have something left to do.
    const actions = {
      Draft: { primaryAction: { label: "Submit expense", onClick: () => submitDraft(opened) }, secondaryAction: { label: "Delete draft", onClick: () => deleteDraft(opened) } },
      Submitted: { secondaryAction: { label: "Withdraw expense", onClick: () => withdraw(opened) } },
      Rejected: { primaryAction: { label: "Edit and resubmit", onClick: () => startExpense(opened) } },
      Approved: {},
      Paid: {},
    }[opened.status];
    return (
      <SidePanel type="standard" title={opened.title} description={opened.id} open onOpenChange={(open) => { if (!open) setOpenId(null); }} {...actions}>
        <Stack gap="lg">
          <Stack direction="row" gap="md" justify="between" align="start">
            <Metric size="md" icon={false} label="Amount" value={formatMoney(opened.amount)} />
            <Badge theme={claimStatusTheme[opened.status]} background="subtle">{opened.status}</Badge>
          </Stack>
          {opened.status === "Rejected" && opened.reply ? <InlineMessage theme="negative" title={`Rejected by ${approver.name}`}>{opened.reply}</InlineMessage> : null}
          <DescriptionList divider items={[
            { id: "merchant", term: "Merchant", description: opened.merchant },
            { id: "category", term: "Category", description: category.name },
            { id: "date", term: "Date", description: formatDate(opened.spent) },
          ]} />
          {opened.note ? <DescriptionList layout="stacked" items={[{ id: "note", term: "Note", description: opened.note }]} /> : null}
          {opened.receipt ? (
            <Stack gap="xs">
              <Heading level={3}>Receipt</Heading>
              <List aria-label="Receipt">
                <ListItem title={opened.receipt} caption={opened.receipt.split(".").pop()?.toUpperCase()}
                  leading={preview ? <Thumbnail src={preview} alt="" /> : <FileIcon format={fileIconFormatOf(opened.receipt)} size="2xl" />}
                  trailing={<IconButton appearance="flat" level="primary" size="md" icon="icon-download-01-line" aria-label="Download receipt" onClick={() => toast({ title: "Receipt downloaded", children: opened.receipt })} />} />
              </List>
            </Stack>
          ) : null}
          <Stack gap="sm">
            <Heading level={3}>Approval</Heading>
            <Stepper orientation="vertical" aria-label="Approval progress" steps={steps} current={current} />
          </Stack>
        </Stack>
      </SidePanel>
    );
  })() : undefined;

  return (
    <HrShell module="expenses" page="my-expenses" onNavigate={navigate} aside={panel}>
      <Container maxWidth="full">
        <Stack gap="xl" paddingY="sm">
          <PageHeader title="My expenses" description={`Work costs you paid yourself, approved by ${approver.name}.`}
            actions={<>
              <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Expenses exported", children: `${plural(shown.length, "expense")} · CSV` })}>Export</Button>
              <Button level="primary" startIcon="icon-plus-line" onClick={() => startExpense()}>New expense</Button>
            </>} />

          <Grid columns="repeat(auto-fit, minmax(min(100%, 240px), 1fr))" gap="md">
            {totals.map((tile) => (
              <MetricCard key={tile.status} variant="title-highlight" size={phone ? "sm" : "xl"} label={tile.label} value={formatMoney(tile.sum)}
                trend={{ direction: "normal", label: plural(tile.count, "expense") }} icon={tile.icon} iconTheme={tile.theme} iconSize="md" />
            ))}
          </Grid>

          {phone ? (
            // Phone: Search, one row of chips that scrolls sideways, the result count, then the claims as a List.
            <Stack gap="sm">
              <Search aria-label="Search expenses" placeholder="Search expenses" value={query} onValueChange={setQuery} />
              <Stack direction="row" gap="xs" role="group" aria-label="Filters" style={{ overflowX: "auto" }}>
                {filterChip("status")}
                {filterChip("category")}
                <Chip variant="advanced" size="md" dropdown aria-haspopup="dialog" aria-expanded={sheet === "sort"} selected={sortChoice !== sortChoices[0]}
                  onClick={() => setSheet("sort")} onClearSelection={() => setSort(defaultSort)}>{sortChoice === sortChoices[0] ? "Sort" : sortChoice.label}</Chip>
              </Stack>
              {shown.length ? (
                <>
                  <Text textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "expense")} · {formatMoney(shown.reduce((sum, claim) => sum + claim.amount, 0))}</Text>
                  <List aria-label="My expenses">
                    {shown.map((claim) => {
                      const category = expenseCategories[claim.category];
                      return (
                        <ListItem key={claim.id} title={claim.title} caption={`${formatDate(claim.spent, { year: false })} · ${claim.merchant}`} selected={claim.id === openId}
                          leading={<DockIcon icon={category.icon} theme={category.theme} background="subtle" size="md" />}
                          trailing={(
                            <Stack gap="2xs" align="end">
                              <Text as="span" textStyle="Body/Base/Bold">{formatMoney(claim.amount)}</Text>
                              <Badge size="sm" theme={claimStatusTheme[claim.status]} background="subtle">{claim.status}</Badge>
                            </Stack>
                          )}
                          onClick={() => setOpenId(claim.id)} />
                      );
                    })}
                  </List>
                </>
              ) : emptyState}
            </Stack>
          ) : (
            // Desktop: the toolbar, the claims Table and the result count sit on the page, like My leaves (a Surface
            // container here would need the Sidebar's shadow; the page reads cleaner without one).
            <Stack gap="md">
              {/* Search fills its column; the filter chips (and Clear all, once two filters are on) share the rest. */}
              <Grid columns="minmax(0, 320px) 1fr" gap="sm" align="center">
                <Search aria-label="Search expenses" placeholder="Search expenses" value={query} onValueChange={setQuery} />
                <Stack direction="row" gap="xs" align="center" wrap>
                  {filterChip("status")}
                  {filterChip("category")}
                  {activeFilters >= 2 ? <Button level="tertiary" onClick={clearFilters}>Clear all</Button> : null}
                </Stack>
              </Grid>
              <Table aria-label="My expenses" rows={shown} getRowId={(row) => row.id} sort={sort} onSortChange={setSort} onRowClick={(row) => setOpenId(row.id)} empty={emptyState}
                selectedIds={opened ? [opened.id] : []}
                columns={[
                  { id: "expense", header: "Expense", cell: (row) => {
                    const category = expenseCategories[row.category];
                    return <TableMedia media={<DockIcon icon={category.icon} theme={category.theme} background="subtle" size="sm" />} caption={`${row.merchant} · ${category.name}`}>{row.title}</TableMedia>;
                  } },
                  { id: "spent", header: "Date", width: "144px", sortable: true, cell: (row) => <TableText>{formatDate(row.spent)}</TableText> },
                  { id: "amount", header: "Amount", width: "136px", align: "right", sortable: true, cell: (row) => <TableText>{formatMoney(row.amount)}</TableText> },
                  { id: "status", header: "Status", width: "152px", cell: (row) => <TableBadges><Badge theme={claimStatusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
                ]} />
              {shown.length ? (
                <Text textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "expense")} · {formatMoney(shown.reduce((sum, claim) => sum + claim.amount, 0))}</Text>
              ) : null}
            </Stack>
          )}
        </Stack>
      </Container>

      {/* Phone filters: a multiple choice keeps the sheet open; Sort is one choice and closes it. */}
      <BottomSheet open={sheetFilter !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheetFilter?.label ?? "Filter"}
        primaryAction={{ label: `Show ${plural(shown.length, "expense")}` }}>
        {sheetFilter ? (
          <List aria-label={sheetFilter.label}>
            {sheetFilter.options.map((option) => {
              const selected = sheetFilter.picked.includes(option.id);
              return <ListItem key={option.id} title={option.label} leading={option.leading} selected={selected} trailing={selected ? check : undefined} onClick={() => sheetFilter.setPicked(toggle(sheetFilter.picked, option.id))} />;
            })}
          </List>
        ) : null}
      </BottomSheet>
      <BottomSheet open={sheet === "sort"} onOpenChange={(open) => { if (!open) setSheet(null); }} title="Sort by">
        <List aria-label="Sort by">
          {sortChoices.map((choice) => (
            <ListItem key={choice.id} title={choice.label} selected={choice === sortChoice} trailing={choice === sortChoice ? check : undefined}
              onClick={() => { setSort(choice.sort); setSheet(null); }} />
          ))}
        </List>
      </BottomSheet>

      <ModalForm open={form !== null} onOpenChange={(open) => { if (!open) setForm(null); }} title={form?.editing ? "Edit expense" : "New expense"}
        description={`${approver.name} gets it for approval.`} onSubmit={expense.handleSubmit}
        primaryAction={{ label: form?.editing ? "Resubmit expense" : "Submit expense" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Description" placeholder="Taxi to the client workshop" autoComplete="off" data-autofocus="" {...expense.field("title")} />
        <InputField label="Merchant" placeholder="Grab" autoComplete="off" {...expense.field("merchant")} />
        <Grid columns={{ mobile: 1, desktop: 2 }} gap="md" align="start">
          <InputField label="Amount" inputMode="decimal" leading="icon-currency-dollar-line" placeholder="42.50" autoComplete="off" {...expense.field("amount")} />
          <DateField label="Date" {...expense.dateField("spent")} />
        </Grid>
        <SelectField label="Category" placeholder="Choose a category" options={expenseCategoryList.map((category) => ({ label: category.name, value: category.id }))}
          helpText={pickedCategory?.limit ? `Up to ${formatMoney(pickedCategory.limit, { cents: false })} per expense` : undefined} {...expense.selectField("category")} />
        <TextAreaField label="Note" labelOptional rows={2} placeholder="Who joined, or what it was for" {...expense.field("note")} />
        <FileUpload label="Receipt" accept="image/jpeg,image/png,application/pdf" caption="JPG, PNG or PDF, up to 10 MB" thumbnail={receiptFile?.previewUrl ? "photo" : "file"}
          files={receiptFile ? [receiptFile] : []} onFilesAdd={addReceipt} error={expense.fieldError("receipt")}
          onRemove={() => { setReceiptFile(null); expense.setValue("receipt", "", { touch: true }); }} />
      </ModalForm>
    </HrShell>
  );
}
