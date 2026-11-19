import { Grid, MetricCard, ProgressBar, type DockIconTheme, type IconName } from "@zen-ds/react";

/** Title-Highlight with its Custom-Slot (Figma Custom=Yes): each budget's spend as a ProgressBar under the number. */
const budgets = [
  { id: "loyalty", label: "Loyalty app", spent: 28400, budget: 36000, icon: "icon-phone-line" as IconName, theme: "orange" as DockIconTheme },
  { id: "banking", label: "Online banking", spent: 51200, budget: 48000, icon: "icon-bank-line" as IconName, theme: "blue" as DockIconTheme },
];

export default function BudgetProgress() {
  return (
    <Grid columns="repeat(auto-fit, minmax(min(100%, 260px), 1fr))" gap="md">
      {budgets.map((item) => {
        const used = Math.round((item.spent / item.budget) * 100);
        return (
          <MetricCard key={item.id} theme="default" variant="title-highlight" size="md" label={item.label} value={`$${item.spent.toLocaleString("en-US")}`}
            icon={item.icon} iconTheme={item.theme}
            trend={{ direction: used > 100 ? "negative" : "normal", label: `$${item.budget.toLocaleString("en-US")}`, subLabel: "budget" }}
            custom={<ProgressBar value={Math.min(used, 100)} theme="status" scale="quota" label={`${used}%`} aria-label={`${item.label} budget used`} />} />
        );
      })}
    </Grid>
  );
}
