/**
 * Template: HR · Expenses › Overview. The studio's spend for a finance lead or an approver:
 * - A period filter (this month, last month, this quarter) that drives the totals and the highlighted chart column.
 * - Four totals: spend against the previous period, what is left of the quarter's budget, what waits for approval and
 *   what was reimbursed. Their chevrons open the exact figures in a Side Panel; Awaiting approval filters the claims.
 * - Spend by category per month (stacked bars) and the monthly trend of the biggest categories (line).
 * - Team budgets for the quarter with how much of each is used.
 * - Recent claims with Status and Team filters; a row opens the claim in a Side Panel, where the approver approves or
 *   rejects it (Undo in the Toast). On a phone the claims become a List and the chips open Bottom Sheets.
 * - New expense opens a validated ModalForm; Export confirms with a Toast.
 *
 * Copy it with ./HrShell, ./data and ./assets into your app and replace the sample data. Render it inside your app's
 * <ZenProvider>. Uses only @zen/design-system components, no custom CSS.
 */
import { useId, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  ChartCard,
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
  LineChart,
  List,
  ListItem,
  Metric,
  MetricCard,
  ModalForm,
  PageHeader,
  ProgressBar,
  SelectField,
  SidePanel,
  Stack,
  StackBarChart,
  Table,
  TableBadges,
  TableMedia,
  TableText,
  Text,
  fileIconFormatOf,
  plural,
  useFormState,
  useToast,
  useZen,
  type IconName,
  type TableSort,
  type UploaderFile,
} from "@zen/design-system";
import { HrShell, hrModules, type HrNavigate } from "./HrShell";
import {
  avatarOf,
  claimStatuses,
  claimStatusTheme,
  currentUser,
  expenseCategories,
  expenseCategoryList,
  expenseClaims,
  formatDate,
  formatMoney,
  formatRange,
  formatRelative,
  monthlySpend,
  now,
  people,
  teamBudgets,
  teamList,
  teams,
  toDate,
  toIsoDay,
  today,
  type ExpenseCategoryId,
  type ExpenseClaim,
  type Quarter,
  type TeamBudget,
} from "./data";

/* ── Periods, measured from today: this month, last month and this quarter, each with the one before it ──────── */
type PeriodId = "this-month" | "last-month" | "this-quarter";
interface Period { id: PeriodId; label: string; name: string; previousName: string; months: string[]; previous: string[]; start: string; end: string }
const day = toDate(today);
const monthStart = (offset: number) => new Date(day.getFullYear(), day.getMonth() + offset, 1);
const monthEnd = (offset: number) => new Date(day.getFullYear(), day.getMonth() + offset + 1, 0);
const monthsFrom = (offset: number, count: number) => Array.from({ length: count }, (_, index) => toIsoDay(monthStart(offset + index)).slice(0, 7));
const monthName = (offset: number, year = false) => monthStart(offset).toLocaleString("en-US", year ? { month: "long", year: "numeric" } : { month: "long" });
const quarterOf = (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}` as Quarter;
/** Months back from this month to the first month of its quarter (0, -1 or -2). */
const quarterOffset = -(day.getMonth() % 3);
const periods: Record<PeriodId, Period> = {
  "this-month": { id: "this-month", label: "This month", name: monthName(0, true), previousName: monthName(-1), months: monthsFrom(0, 1), previous: monthsFrom(-1, 1), start: toIsoDay(monthStart(0)), end: toIsoDay(monthEnd(0)) },
  "last-month": { id: "last-month", label: "Last month", name: monthName(-1, true), previousName: monthName(-2), months: monthsFrom(-1, 1), previous: monthsFrom(-2, 1), start: toIsoDay(monthStart(-1)), end: toIsoDay(monthEnd(-1)) },
  "this-quarter": { id: "this-quarter", label: "This quarter", name: quarterOf(day), previousName: quarterOf(monthStart(quarterOffset - 3)).split(" ")[0], months: monthsFrom(quarterOffset, 3), previous: monthsFrom(quarterOffset - 3, 3), start: toIsoDay(monthStart(quarterOffset)), end: toIsoDay(monthEnd(quarterOffset + 2)) },
};
const periodList = Object.values(periods);

/* ── Spend and budgets ───────────────────────────────────────────────────────────────────────────────────────── */
const monthTotal = (month: (typeof monthlySpend)[number]) => expenseCategoryList.reduce((sum, category) => sum + month.spend[category.id], 0);
const spendIn = (months: string[]) => monthlySpend.filter((month) => months.includes(month.month));
const sumOf = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
/** Budgets are set per team and quarter; the team table shows this quarter's. */
const quarter = quarterOf(day);
const quarterBudgets = teamBudgets.filter((budget) => budget.quarter === quarter);
/** A quarter's budget as it stood on a day: its teams' budgets less the spend of its months up to that day. */
function budgetOn(end: string) {
  const name = quarterOf(toDate(end));
  const budget = sumOf(teamBudgets.filter((item) => item.quarter === name).map((item) => item.budget));
  const spent = sumOf(monthlySpend.filter((month) => quarterOf(toDate(`${month.month}-01`)) === name && month.month <= end.slice(0, 7)).map(monthTotal));
  return { quarter: name, budget, spent, left: budget - spent, used: budget ? (spent / budget) * 100 : 0 };
}
/** The two biggest categories over the months shown, for the trend's range switch (labels stay whole on a phone). */
const topCategories = [...expenseCategoryList].sort((a, b) => sumOf(monthlySpend.map((month) => month.spend[b.id])) - sumOf(monthlySpend.map((month) => month.spend[a.id]))).slice(0, 2);
const trendRanges = [{ id: "all", label: "All" }, ...topCategories.map((category) => ({ id: category.id, label: category.name }))];
const shownMonths = `${monthlySpend[0].label} – ${monthlySpend[monthlySpend.length - 1].label} ${day.getFullYear()}`;
/** Chart axes and tooltips round from $1,000 up ("$23.4K"); the Side Panels show the exact figures. */
const chartMoney = (value: number) => formatMoney(value, { compact: true, cents: false });

/* ── Claims: submitted ones only (drafts stay with their author); the signed-in person approves their team's ─── */
const approver = people[currentUser.manager ?? currentUser.id];
const lastClaimNumber = Math.max(...expenseClaims.map((claim) => Number(claim.id.replace("EXP-", ""))));
type FilterOption = { id: string; label: string; leading?: IconName };
const statusOptions: FilterOption[] = claimStatuses.filter((status) => status !== "Draft").map((status) => ({ id: status, label: status }));
const teamOptions: FilterOption[] = teamList.map((team) => ({ id: team.id, label: team.name, leading: team.icon }));
const sorters: Record<string, (a: ExpenseClaim, b: ExpenseClaim) => number> = {
  submitted: (a, b) => (a.submitted ?? "").localeCompare(b.submitted ?? ""),
  amount: (a, b) => a.amount - b.amount,
};

/* ── New expense form: DateField speaks MM/DD/YYYY, the data ISO days; amounts are typed as text ─────────────── */
type ExpenseValues = { title: string; merchant: string; amount: string; category: string; spent: string; receipt: string };
const pad = (value: number) => String(value).padStart(2, "0");
const toFieldDate = (iso: string) => { const date = toDate(iso); return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`; };
const fromFieldDate = (text: string) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getMonth() === Number(match[1]) - 1 ? toIsoDay(date) : null;
};
const parseAmount = (text: string) => { const clean = text.replace(/[$,\s]/g, ""); return /^\d+(\.\d{1,2})?$/.test(clean) ? Number(clean) : Number.NaN; };
const fileSize = (bytes: number) => (bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`);
const maxReceiptBytes = 10_000_000;
const blankExpense: ExpenseValues = { title: "", merchant: "", amount: "", category: "", spent: toFieldDate(today), receipt: "" };

/** The exact figures behind a rounded total, shown in a small Side Panel (they follow the period while it is open). */
type ReportId = "spend" | "budget" | "reimbursed" | "months";
type Report = { title: string; description: string; items: Array<{ id: string; term: string; description: string; emphasis?: boolean }> };

export function HrExpenseOverviewTemplate() {
  const { toast, dismiss } = useToast();
  const phone = useZen()?.breakpoint === "mobile";
  const budgetsTitle = useId();
  const claimsTitle = useId();
  const [periodId, setPeriodId] = useState<PeriodId>("this-month");
  const [trend, setTrend] = useState("all");
  const [claims, setClaims] = useState(() => expenseClaims.filter((claim) => claim.status !== "Draft"));
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<TableSort | null>({ columnId: "submitted", direction: "desc" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<ReportId | null>(null);
  const [creating, setCreating] = useState(false);
  const [receiptFile, setReceiptFile] = useState<UploaderFile | null>(null);
  // Phones pick the period and the filters in Bottom Sheets.
  const [sheet, setSheet] = useState<"period" | "status" | "team" | null>(null);

  /* ── Totals for the period ── */
  const period = periods[periodId];
  const months = spendIn(period.months);
  const spend = sumOf(months.map(monthTotal));
  const previousSpend = sumOf(spendIn(period.previous).map(monthTotal));
  const change = previousSpend ? Math.round(((spend - previousSpend) / previousSpend) * 100) : 0;
  const budget = budgetOn(period.end);
  const waiting = claims.filter((claim) => claim.status === "Submitted");
  const reimbursed = claims.filter((claim) => claim.paid && claim.paid >= period.start && claim.paid <= period.end);
  const activeMonth = monthlySpend.findIndex((month) => month.month === period.months[period.months.length - 1]);

  const shown = useMemo(() => {
    const list = claims.filter((claim) => (!statusFilter.length || statusFilter.includes(claim.status)) && (!teamFilter.length || teamFilter.includes(people[claim.person].team)));
    if (!sort) return list;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => sorters[sort.columnId](a, b) * direction);
  }, [claims, statusFilter, teamFilter, sort]);
  const opened = claims.find((claim) => claim.id === openId) ?? null;
  const clearFilters = () => { setStatusFilter([]); setTeamFilter([]); };

  const navigate: HrNavigate = (target) => {
    if (target.module === "expenses" && target.page === "overviews") return;
    if (target.module === "home") { toast({ title: "Home isn't part of this demo" }); return; }
    const { title, sections } = hrModules[target.module];
    const pages = sections.flatMap((section) => section.items.flatMap((item) => [item, ...(item.children ?? [])]));
    const page = pages.find((item) => item.id === (target.page ?? pages[0]?.id));
    toast({ title: `${page?.label ?? title} isn't part of this demo` });
  };

  /* ── Side Panels: one claim, or the figures behind a total ── */
  const openClaim = (id: string) => { setReportId(null); setOpenId(id); };
  const openReport = (id: ReportId) => { setOpenId(null); setReportId(id); };
  const reports: Record<ReportId, () => Report> = {
    spend: () => ({
      title: `Spend in ${period.name}`,
      description: `Compared with ${formatMoney(previousSpend)} in ${period.previousName}.`,
      items: [
        ...expenseCategoryList.map((category) => ({ id: category.id, term: category.name, amount: sumOf(months.map((month) => month.spend[category.id])) }))
          .sort((a, b) => b.amount - a.amount).map(({ id, term, amount }) => ({ id, term, description: formatMoney(amount) })),
        { id: "total", term: "Total", description: formatMoney(spend), emphasis: true },
      ],
    }),
    budget: () => ({
      title: `${budget.quarter} budget`,
      description: `As of ${formatDate(period.end)}, across every team.`,
      items: [
        { id: "budget", term: "Budget", description: formatMoney(budget.budget) },
        { id: "spent", term: "Spent", description: formatMoney(budget.spent) },
        { id: "left", term: "Left", description: formatMoney(budget.left), emphasis: true },
      ],
    }),
    reimbursed: () => ({
      title: `Reimbursed in ${period.name}`,
      description: reimbursed.length ? `${plural(reimbursed.length, "claim")} paid out.` : "No claims were paid out.",
      items: [
        ...reimbursed.map((claim) => ({ id: claim.id, term: `${people[claim.person].name} · ${claim.title}`, description: formatMoney(claim.amount) })),
        { id: "total", term: "Total", description: formatMoney(sumOf(reimbursed.map((claim) => claim.amount))), emphasis: true },
      ],
    }),
    months: () => ({
      title: "Spend by month",
      description: `${shownMonths}, every category.`,
      items: [
        ...monthlySpend.map((month) => ({ id: month.month, term: toDate(`${month.month}-01`).toLocaleString("en-US", { month: "long" }), description: formatMoney(monthTotal(month)) })),
        { id: "total", term: "Total", description: formatMoney(sumOf(monthlySpend.map(monthTotal))), emphasis: true },
      ],
    }),
  };
  /** Awaiting approval → the claims table, filtered to what waits. */
  const showWaiting = () => {
    setStatusFilter(["Submitted"]); setTeamFilter([]);
    document.getElementById(claimsTitle)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  // The tile's chevron (Button/Icon-Main XSmall Tertiary), the same one HR Home's tiles use.
  const breakdown = (label: string, onClick: () => void) => <IconButton size="xs" icon="icon-chevron-right-line" aria-label={label} onClick={onClick} />;

  /* ── Approvals: each decision shows at once, closes the panel and can be undone ── */
  const update = (id: string, patch: Partial<ExpenseClaim>) => setClaims((list) => list.map((claim) => (claim.id === id ? { ...claim, ...patch } : claim)));
  const decide = (claim: ExpenseClaim, status: "Approved" | "Rejected") => {
    update(claim.id, { status, decided: now });
    setOpenId(null);
    const toastId = toast({ title: status === "Approved" ? "Claim approved" : "Claim rejected", children: `${people[claim.person].name} · ${formatMoney(claim.amount)}`,
      action: { label: "Undo", onClick: () => { update(claim.id, { status: claim.status, decided: claim.decided }); dismiss(toastId); } } });
  };

  /* ── New expense: lands on top of the claims and in Awaiting approval ── */
  const expense = useFormState({
    initialValues: blankExpense,
    validate: (values) => {
      const amount = parseAmount(values.amount);
      const limit = values.category ? expenseCategories[values.category as ExpenseCategoryId].limit : undefined;
      const spent = fromFieldDate(values.spent);
      return {
        ...(values.title.trim() ? {} : { title: "Describe the expense, like Taxi to the client workshop" }),
        ...(values.merchant.trim() ? {} : { merchant: "Enter the merchant, like Grab" }),
        ...(!(amount > 0) ? { amount: "Enter the amount, like 42.50" }
          : limit && amount > limit ? { amount: `Enter ${formatMoney(limit, { cents: false })} or less, the ${expenseCategories[values.category as ExpenseCategoryId].name} limit` } : {}),
        ...(values.category ? {} : { category: "Choose a category" }),
        ...(!spent ? { spent: "Enter the date as MM/DD/YYYY" } : spent > today ? { spent: "Pick today or an earlier day" } : {}),
        ...(values.receipt ? {} : { receipt: "Add a photo or PDF of the receipt" }),
      };
    },
    onSubmit: (values) => {
      const id = `EXP-${Math.max(lastClaimNumber, ...claims.map((claim) => Number(claim.id.replace("EXP-", "")))) + 1}`;
      const amount = parseAmount(values.amount);
      setClaims((list) => [{
        id, person: currentUser.id, title: values.title.trim(), merchant: values.merchant.trim(), category: values.category as ExpenseCategoryId,
        amount, spent: fromFieldDate(values.spent) ?? today, submitted: now, status: "Submitted", approver: approver.id, receipt: values.receipt,
      }, ...list]);
      setCreating(false);
      const toastId = toast({ title: "Expense submitted", children: `${formatMoney(amount)} sent to ${approver.name} for approval`,
        action: { label: "View", onClick: () => { dismiss(toastId); openClaim(id); } } });
    },
  });
  const startExpense = () => { expense.reset(blankExpense); setReceiptFile(null); setCreating(true); };
  const addReceipt = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const problem = !/\.(jpe?g|png|pdf)$/i.test(file.name) ? "Use a JPG, PNG or PDF file" : file.size > maxReceiptBytes ? "Choose a file under 10 MB" : undefined;
    if (problem) { setReceiptFile(null); expense.setValue("receipt", "", { touch: true }); expense.setError("receipt", problem); return; }
    setReceiptFile({ id: `${file.name}-${file.lastModified}`, name: file.name, size: fileSize(file.size), state: "uploaded" });
    expense.setValue("receipt", file.name, { touch: true });
  };
  const pickedCategory = expense.values.category ? expenseCategories[expense.values.category as ExpenseCategoryId] : undefined;

  /* ── Filters: Chip popovers on a desktop; on a phone each chip opens a Bottom Sheet with the same choices ── */
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const filters = {
    status: { label: "Status", options: statusOptions, picked: statusFilter, setPicked: setStatusFilter },
    team: { label: "Team", options: teamOptions, picked: teamFilter, setPicked: setTeamFilter },
  };
  const filterChip = (id: keyof typeof filters) => {
    const { label, options, picked, setPicked } = filters[id];
    const shared = { variant: "advanced", size: "md", dropdown: true, selectionMode: "multiple", selected: picked.length > 0, selectionCount: picked.length, onClearSelection: () => setPicked([]) } as const;
    const chipLabel = picked.length === 1 ? options.find((option) => option.id === picked[0])?.label : label;
    return phone
      ? <Chip key={id} {...shared} aria-haspopup="dialog" aria-expanded={sheet === id} onClick={() => setSheet(id)}>{chipLabel}</Chip>
      : (
        <Chip key={id} {...shared} popoverMultiple popoverLabel={label} popoverItems={options.map((option) => ({ ...option, selected: picked.includes(option.id) }))}
          onPopoverSelect={(item) => setPicked(toggle(picked, item.id))}>{chipLabel}</Chip>
      );
  };
  const sheetFilter = sheet === "status" || sheet === "team" ? filters[sheet] : null;
  const check = <Icon name="icon-check-line" size="base" decorative />;
  const noClaims = <EmptyState title="No claims match" headingLevel={3} illustration={false} icon="icon-search-medium-line" secondaryAction={{ label: "Clear filters", onClick: clearFilters }}>Try another status or team.</EmptyState>;

  const claimPanel = opened ? (() => {
    const person = people[opened.person];
    const category = expenseCategories[opened.category];
    const decider = people[opened.approver];
    const mine = opened.status === "Submitted" && opened.approver === currentUser.id;
    return (
      <SidePanel type="standard" title={opened.title} description={`${opened.id} · ${opened.merchant}`} open onOpenChange={(open) => { if (!open) setOpenId(null); }}
        {...(mine ? { primaryAction: { label: "Approve claim", onClick: () => decide(opened, "Approved") }, secondaryAction: { label: "Reject claim", onClick: () => decide(opened, "Rejected") } } : {})}>
        <Stack gap="lg">
          <Stack direction="row" gap="md" justify="between" align="start">
            <Metric size="md" icon={false} label="Amount" value={formatMoney(opened.amount)} />
            <Badge theme={claimStatusTheme[opened.status]} background="subtle">{opened.status}</Badge>
          </Stack>
          {category.limit && opened.amount > category.limit
            ? <InlineMessage theme="warning" title="Over the policy limit">{`${category.name} claims are capped at ${formatMoney(category.limit, { cents: false })}.`}</InlineMessage> : null}
          {opened.status === "Rejected" && opened.reply ? <InlineMessage theme="negative" title={`Rejected by ${decider.name}`}>{opened.reply}</InlineMessage> : null}
          <List aria-label="Submitted by">
            <ListItem title={person.name} caption={`${person.role} · ${teams[person.team].name}`} leading={<Avatar size="md" {...avatarOf(person)} alt="" />} />
          </List>
          <DescriptionList divider items={[
            { id: "category", term: "Category", description: category.name },
            { id: "spent", term: "Date", description: formatDate(opened.spent) },
            { id: "submitted", term: "Submitted", description: opened.submitted ? formatRelative(opened.submitted) : "Not submitted" },
            { id: "approver", term: opened.decided ? (opened.status === "Rejected" ? "Rejected by" : "Approved by") : "Approver", description: opened.decided ? `${decider.name} · ${formatRelative(opened.decided)}` : decider.name },
            ...(opened.paid ? [{ id: "paid", term: "Paid", description: formatDate(opened.paid) }] : []),
            ...(opened.note ? [{ id: "note", term: "Note", description: opened.note }] : []),
          ]} />
          {opened.receipt ? (
            <Stack gap="xs">
              <Heading level={3}>Receipt</Heading>
              <List aria-label="Receipt">
                <ListItem title={opened.receipt} caption={opened.receipt.split(".").pop()?.toUpperCase()}
                  leading={<FileIcon format={fileIconFormatOf(opened.receipt)} size="2xl" />}
                  trailing={<IconButton appearance="flat" level="primary" size="md" icon="icon-download-01-line" aria-label="Download receipt" onClick={() => toast({ title: "Receipt downloaded", children: opened.receipt })} />} />
              </List>
            </Stack>
          ) : null}
        </Stack>
      </SidePanel>
    );
  })() : null;

  const report = reportId ? reports[reportId]() : null;
  const reportPanel = report ? (
    <SidePanel type="standard" size="small" title={report.title} description={report.description} open onOpenChange={(open) => { if (!open) setReportId(null); }}>
      <DescriptionList divider items={report.items} />
    </SidePanel>
  ) : null;

  return (
    <HrShell module="expenses" page="overviews" onNavigate={navigate} aside={claimPanel ?? reportPanel ?? undefined}
      approvals={claims.filter((claim) => claim.status === "Submitted" && claim.approver === currentUser.id).length}>
      <Container maxWidth="full">
        <Stack gap="xl" paddingY="sm">
          <Stack gap="md">
            <PageHeader title="Expense overview" description="Studio spend across company cards, invoices and expense claims."
              actions={<>
                <Button level="tertiary" startIcon="icon-download-01-line" onClick={() => toast({ title: "Overview exported", children: `${period.name} · CSV` })}>Export</Button>
                <Button level="primary" startIcon="icon-plus-line" onClick={startExpense}>New expense</Button>
              </>} />
            <Stack direction="row" gap="sm" align="center" wrap>
              {phone ? (
                <Chip variant="advanced" size="md" dropdown leading="icon-calendar-line" aria-haspopup="dialog" aria-expanded={sheet === "period"} onClick={() => setSheet("period")}>{period.label}</Chip>
              ) : (
                <Chip variant="advanced" size="md" dropdown leading="icon-calendar-line" popoverLabel="Period"
                  popoverItems={periodList.map((item) => ({ id: item.id, label: item.label, selected: item.id === periodId }))}
                  onPopoverSelect={(item) => setPeriodId(item.id as PeriodId)}>{period.label}</Chip>
              )}
              <Text as="span" tone="base">{formatRange(period.start, period.end)}</Text>
            </Stack>
          </Stack>

          {/* Two pairs of totals: four in a row when there is room, two by two below that, never three and one. */}
          <Grid columns="repeat(auto-fit, minmax(min(100%, 496px), 1fr))" gap="md">
            <Grid columns="repeat(auto-fit, minmax(min(100%, 240px), 1fr))" gap="md">
              <MetricCard variant="title-highlight" size={phone ? "md" : "xl"} icon={false} label="Total spend" value={formatMoney(spend, { compact: true })}
                trend={{ direction: "normal", label: `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change)}% vs ${period.previousName}` }}
                action={breakdown("Open spend by category", () => openReport("spend"))} />
              {/* The quarter's budget: the bar turns Warning from 75% used and Negative from 90%. */}
              <Card>
                <Stack gap="2xs">
                  <Metric variant="title-highlight" size={phone ? "md" : "xl"} icon={false} label={`${budget.quarter.split(" ")[0]} budget left`} value={formatMoney(budget.left, { compact: true })}
                    action={breakdown(`Open the ${budget.quarter} budget`, () => openReport("budget"))} />
                  <ProgressBar theme="status" scale="quota" value={budget.used} label={`${Math.round(budget.used)}% used`} aria-label={`${budget.quarter} budget used`} />
                </Stack>
              </Card>
            </Grid>
            <Grid columns="repeat(auto-fit, minmax(min(100%, 240px), 1fr))" gap="md">
              <MetricCard variant="title-highlight" size={phone ? "md" : "xl"} icon={false} label="Awaiting approval" value={formatMoney(sumOf(waiting.map((claim) => claim.amount)), { compact: true })}
                trend={{ direction: "normal", label: plural(waiting.length, "claim") }}
                action={breakdown("Show claims awaiting approval", showWaiting)} />
              <MetricCard variant="title-highlight" size={phone ? "md" : "xl"} icon={false} label="Reimbursed" value={formatMoney(sumOf(reimbursed.map((claim) => claim.amount)), { compact: true })}
                trend={{ direction: "normal", label: plural(reimbursed.length, "claim") }}
                action={breakdown("Open reimbursed claims", () => openReport("reimbursed"))} />
            </Grid>
          </Grid>

          {/* The period's last month is the active column; ←/→ move through the others. */}
          <Grid columns="repeat(auto-fit, minmax(min(100%, 360px), 1fr))" gap="md">
            <ChartCard title="Spend by category" headingLevel={2} theme="shadow" onOpen={() => openReport("months")} openLabel="Open spend by month">
              <StackBarChart key={periodId} initialIndex={activeMonth} aria-label={`Spend by category and month, ${shownMonths}`} format={chartMoney} height={220}
                series={expenseCategoryList.map((category) => ({ id: category.id, label: category.name }))}
                data={monthlySpend.map((month) => ({ label: month.label, values: month.spend }))} />
            </ChartCard>
            {/* A phone sizes the range switch to its labels, so "Equipment" isn't cut to fit equal thirds. */}
            <ChartCard title="Monthly trend" headingLevel={2} theme="shadow" ranges={trendRanges} range={trend} onRangeChange={setTrend} rangesFullWidth={!phone}>
              <LineChart key={`${periodId}-${trend}`} initialIndex={activeMonth} format={chartMoney} height={220}
                aria-label={`${trend === "all" ? "Total spend" : `${expenseCategories[trend as ExpenseCategoryId].name} spend`} per month, ${shownMonths}`}
                data={monthlySpend.map((month) => ({ label: month.label, value: trend === "all" ? monthTotal(month) : month.spend[trend as ExpenseCategoryId] }))} />
            </ChartCard>
          </Grid>

          <Stack gap="md">
            <Stack gap="xs">
              <Heading level={2} textStyle="Heading/4" id={budgetsTitle}>Team budgets</Heading>
              <Text tone="base">{`${quarter} · ${formatRange(periods["this-quarter"].start, periods["this-quarter"].end)}`}</Text>
            </Stack>
            <Table aria-labelledby={budgetsTitle} rows={quarterBudgets} getRowId={(row) => row.team}
              // A phone keeps two columns, so nothing scrolls sideways: the team with what it spent of its budget in
              // the caption (compact amounts), and the share used (red once over budget) where the bar would not fit.
              columns={[
                { id: "team", header: "Team", cell: (row) => {
                  const team = teams[row.team];
                  return <TableMedia bold media={<DockIcon icon={team.icon} theme={team.theme} background="subtle" size="sm" />}
                    caption={phone ? `${formatMoney(row.spent, { compact: true })} of ${formatMoney(row.budget, { compact: true })}` : plural(team.headcount, "person", "people")}>{team.name}</TableMedia>;
                } },
                ...(phone ? [] : [
                  { id: "budget", header: "Budget", width: "136px", align: "right" as const, cell: (row: TeamBudget) => <TableText>{formatMoney(row.budget)}</TableText> },
                  { id: "spent", header: "Spent", width: "136px", align: "right" as const, cell: (row: TeamBudget) => <TableText>{formatMoney(row.spent)}</TableText> },
                  { id: "left", header: "Left", width: "136px", align: "right" as const, cell: (row: TeamBudget) => <TableText>{formatMoney(row.budget - row.spent)}</TableText> },
                ]),
                { id: "used", header: "Used", width: phone ? "80px" : "208px", align: phone ? "right" : undefined, cell: (row) => {
                  const used = (row.spent / row.budget) * 100;
                  if (phone) return <TableText>{used > 100 ? <Text as="span" tone="negative">{`${Math.round(used)}%`}</Text> : `${Math.round(used)}%`}</TableText>;
                  return <ProgressBar theme="status" scale="quota" value={used} label={`${Math.round(used)}%`} aria-label={`${teams[row.team].name} budget used`} />;
                } },
              ]} />
          </Stack>

          <Stack gap="md">
            <Stack direction="row" gap="sm" justify="between" align="center" wrap>
              <Heading level={2} textStyle="Heading/4" id={claimsTitle}>Recent claims</Heading>
              {/* On a phone the chips stay on one row that scrolls sideways. */}
              <Stack direction="row" gap="xs" align="center" wrap={!phone} role="group" aria-label="Filter claims" style={phone ? { overflowX: "auto" } : undefined}>
                {filterChip("status")}
                {filterChip("team")}
                {statusFilter.length > 0 && teamFilter.length > 0 ? <Button level="tertiary" onClick={clearFilters}>Clear all</Button> : null}
              </Stack>
            </Stack>
            {phone ? (
              // A phone lists the same claims: who and when in the caption, the amount and status at the end.
              shown.length ? (
                <>
                  <Text textStyle="Body/Small/Regular" tone="base">{plural(shown.length, "claim")} · {formatMoney(sumOf(shown.map((claim) => claim.amount)))}</Text>
                  <List aria-labelledby={claimsTitle}>
                    {shown.map((claim) => {
                      const category = expenseCategories[claim.category];
                      return (
                        <ListItem key={claim.id} title={claim.title} selected={claim.id === openId} onClick={() => openClaim(claim.id)}
                          caption={`${people[claim.person].name}${claim.submitted ? ` · ${formatDate(claim.submitted, { year: false })}` : ""}`}
                          leading={<DockIcon icon={category.icon} theme={category.theme} background="subtle" size="md" />}
                          trailing={(
                            <Stack gap="2xs" align="end">
                              <Text as="span" textStyle="Body/Base/Bold">{formatMoney(claim.amount)}</Text>
                              <Badge size="sm" theme={claimStatusTheme[claim.status]} background="subtle">{claim.status}</Badge>
                            </Stack>
                          )} />
                      );
                    })}
                  </List>
                </>
              ) : noClaims
            ) : (
              // The opened claim's row stays selected while its panel is open.
              <Table aria-labelledby={claimsTitle} rows={shown} getRowId={(row) => row.id} sort={sort} onSortChange={setSort} onRowClick={(row) => openClaim(row.id)}
                selectedIds={opened ? [opened.id] : []} empty={noClaims}
                columns={[
                  { id: "claim", header: "Claim", cell: (row) => {
                    const category = expenseCategories[row.category];
                    return <TableMedia bold media={<DockIcon icon={category.icon} theme={category.theme} background="subtle" size="sm" />} caption={row.merchant}>{row.title}</TableMedia>;
                  } },
                  { id: "person", header: "Person", width: "184px", cell: (row) => {
                    const person = people[row.person];
                    return <TableMedia bold={false} media={<Avatar size="sm" {...avatarOf(person)} alt="" />} caption={teams[person.team].name}>{person.name}</TableMedia>;
                  } },
                  { id: "submitted", header: "Submitted", width: "136px", sortable: true, cell: (row) => <TableText>{row.submitted ? formatDate(row.submitted) : ""}</TableText> },
                  { id: "amount", header: "Amount", width: "120px", align: "right", sortable: true, cell: (row) => <TableText>{formatMoney(row.amount)}</TableText> },
                  { id: "status", header: "Status", width: "128px", cell: (row) => <TableBadges><Badge theme={claimStatusTheme[row.status]} background="subtle">{row.status}</Badge></TableBadges> },
                ]} />
            )}
          </Stack>
        </Stack>
      </Container>

      {/* Phone choices: the period is one choice and closes its sheet; a filter keeps it open until Show. */}
      <BottomSheet open={sheet === "period"} onOpenChange={(open) => { if (!open) setSheet(null); }} title="Period">
        <List aria-label="Period">
          {periodList.map((item) => (
            <ListItem key={item.id} title={item.label} caption={formatRange(item.start, item.end)} selected={item.id === periodId} trailing={item.id === periodId ? check : undefined}
              onClick={() => { setPeriodId(item.id); setSheet(null); }} />
          ))}
        </List>
      </BottomSheet>
      <BottomSheet open={sheetFilter !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} title={sheetFilter?.label ?? "Filter"}
        primaryAction={{ label: `Show ${plural(shown.length, "claim")}` }}>
        {sheetFilter ? (
          <List aria-label={sheetFilter.label}>
            {sheetFilter.options.map((option) => {
              const selected = sheetFilter.picked.includes(option.id);
              return <ListItem key={option.id} title={option.label} leading={option.leading} selected={selected} trailing={selected ? check : undefined} onClick={() => sheetFilter.setPicked(toggle(sheetFilter.picked, option.id))} />;
            })}
          </List>
        ) : null}
      </BottomSheet>

      <ModalForm open={creating} onOpenChange={setCreating} title="New expense" description={`${approver.name} gets it for approval.`}
        onSubmit={expense.handleSubmit} primaryAction={{ label: "Submit expense" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Description" placeholder="Taxi to the client workshop" autoComplete="off" data-autofocus="" {...expense.field("title")} />
        <InputField label="Merchant" placeholder="Grab" autoComplete="off" {...expense.field("merchant")} />
        <Grid columns={{ mobile: 1, desktop: 2 }} gap="md" align="start">
          <InputField label="Amount" inputMode="decimal" leading="icon-currency-dollar-line" placeholder="42.50" autoComplete="off" {...expense.field("amount")} />
          <DateField label="Date" {...expense.dateField("spent")} />
        </Grid>
        <SelectField label="Category" placeholder="Choose a category" options={expenseCategoryList.map((category) => ({ label: category.name, value: category.id }))}
          helpText={pickedCategory?.limit ? `Up to ${formatMoney(pickedCategory.limit, { cents: false })} per expense` : undefined} {...expense.selectField("category")} />
        <FileUpload label="Receipt" accept="image/jpeg,image/png,application/pdf" caption="JPG, PNG or PDF, up to 10 MB" thumbnail="file"
          files={receiptFile ? [receiptFile] : []} onFilesAdd={addReceipt} error={expense.fieldError("receipt")}
          onRemove={() => { setReceiptFile(null); expense.setValue("receipt", "", { touch: true }); }} />
      </ModalForm>
    </HrShell>
  );
}
