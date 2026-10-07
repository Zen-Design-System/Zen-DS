import type { ComponentType } from "react";
import { List, ListItem } from "../../components/ListItem";
import { Text, plural } from "../../components/Text";
import { DashboardTemplate } from "../../templates/DashboardTemplate";
import dashboardSource from "../../templates/DashboardTemplate.tsx?raw";
import { EmptyErrorTemplate } from "../../templates/EmptyErrorTemplate";
import emptyErrorSource from "../../templates/EmptyErrorTemplate.tsx?raw";
import { MobileListTemplate } from "../../templates/MobileListTemplate";
import { AdminListTemplate } from "../../templates/AdminListTemplate";
import adminListSource from "../../templates/AdminListTemplate.tsx?raw";
import { SettingsFormTemplate } from "../../templates/SettingsFormTemplate";
import { SignInTemplate } from "../../templates/SignInTemplate";
import signInSource from "../../templates/SignInTemplate.tsx?raw";
import settingsFormSource from "../../templates/SettingsFormTemplate.tsx?raw";
import mobileListSource from "../../templates/MobileListTemplate.tsx?raw";
import { DetailTemplate } from "../../templates/DetailTemplate";
import detailSource from "../../templates/DetailTemplate.tsx?raw";
import { MobileDetailTemplate } from "../../templates/MobileDetailTemplate";
import mobileDetailSource from "../../templates/MobileDetailTemplate.tsx?raw";
import { HrHomeTemplate } from "../../templates/hr/HrHomeTemplate";
import hrHomeTemplateSource from "../../templates/hr/HrHomeTemplate.tsx?raw";
import { HrExpenseOverviewTemplate } from "../../templates/hr/HrExpenseOverviewTemplate";
import hrExpenseOverviewTemplateSource from "../../templates/hr/HrExpenseOverviewTemplate.tsx?raw";
import { HrMyExpensesTemplate } from "../../templates/hr/HrMyExpensesTemplate";
import hrMyExpensesTemplateSource from "../../templates/hr/HrMyExpensesTemplate.tsx?raw";
import { HrMyLeavesTemplate } from "../../templates/hr/HrMyLeavesTemplate";
import hrMyLeavesTemplateSource from "../../templates/hr/HrMyLeavesTemplate.tsx?raw";
import { HrLeaveTypesTemplate } from "../../templates/hr/HrLeaveTypesTemplate";
import hrLeaveTypesTemplateSource from "../../templates/hr/HrLeaveTypesTemplate.tsx?raw";
import { HrPublicHolidayTemplate } from "../../templates/hr/HrPublicHolidayTemplate";
import hrPublicHolidayTemplateSource from "../../templates/hr/HrPublicHolidayTemplate.tsx?raw";
import { HrTasksTemplate } from "../../templates/hr/HrTasksTemplate";
import hrTasksTemplateSource from "../../templates/hr/HrTasksTemplate.tsx?raw";
import { ZenProvider } from "../../components/Provider";
import { PlatformPhone } from "../PlatformPhone";
import { Panel, keepOnHotUpdate } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./templates.css";

type TemplateDef = { id: string; title: string; description: string; Component: ComponentType; source: string; file: string; mobile?: boolean };

/**
 * Page templates (src/templates): real, type-checked screens built only from Zen components. The code panel shows the
 * file itself (`?raw`), so it can never drift from what renders. They ship in the package as source to copy.
 */
export const templates: TemplateDef[] = keepOnHotUpdate(import.meta.hot, "templates", [
  { id: "admin-list", title: "Admin list · Team members", description: "A workspace admin's members page: search, role and status filters, a sortable table with row menus and bulk actions in an Action Bar, and a validated invite form.", Component: AdminListTemplate, source: adminListSource, file: "src/templates/AdminListTemplate.tsx" },
  { id: "detail", title: "Detail page · Invoice", description: "An invoice with its status, Record payment and a More menu, line items with totals, the amount due with an overdue reminder, the client, and an activity timeline.", Component: DetailTemplate, source: detailSource, file: "src/templates/DetailTemplate.tsx" },
  { id: "dashboard", title: "Dashboard", description: "A studio's operations overview: a period filter, four KPI tiles with breakdown panels, revenue and billable-hours charts, an active projects table that opens a project panel, recent activity and a new project form.", Component: DashboardTemplate, source: dashboardSource, file: "src/templates/DashboardTemplate.tsx" },
  { id: "settings-form", title: "Settings form", description: "A workspace owner's settings in annotated sections: a validated profile with photo upload and a Save bar that says why it's off, instant email toggles, password and 2-step verification, and a delete-workspace dialog that asks for the name.", Component: SettingsFormTemplate, source: settingsFormSource, file: "src/templates/SettingsFormTemplate.tsx" },
  { id: "sign-in", title: "Sign in", description: "A centred sign-in card: validated email and password with Show password, a loading state, a wrong-credentials message, SSO, a forgot-password flow and legal links.", Component: SignInTemplate, source: signInSource, file: "src/templates/SignInTemplate.tsx" },
  { id: "mobile-list", title: "Mobile list · Orders", description: "A phone order list: a large title whose Search folds on scroll, status chips and a date Bottom Sheet, thumbnail rows with a status and relative time, Load more, and an order sheet with cancel (Undo) and order again.", Component: MobileListTemplate, source: mobileListSource, file: "src/templates/MobileListTemplate.tsx", mobile: true },
  { id: "mobile-detail", title: "Mobile detail · Order", description: "A phone order detail: Back and Share, the delivery Stepper, the prints with thumbnails, delivery details with Copy, totals, and an Action Bar whose Get help opens an action Bottom Sheet.", Component: MobileDetailTemplate, source: mobileDetailSource, file: "src/templates/MobileDetailTemplate.tsx", mobile: true },
  { id: "empty-error", title: "Empty and error states", description: "A Projects page in its real states: a failed load with Try again, loading skeletons, filters with no match, a new workspace with no projects yet, and a deleted project's not-found page.", Component: EmptyErrorTemplate, source: emptyErrorSource, file: "src/templates/EmptyErrorTemplate.tsx" },
  { id: "hr-home", title: "HR · Home", description: "The HR workspace's landing page on the icon rail: Zen AI with quick actions, approvals to review with Undo, who's out, the next public holiday and the studio's key numbers.", Component: HrHomeTemplate, source: hrHomeTemplateSource, file: "src/templates/hr/HrHomeTemplate.tsx" },
  { id: "hr-expense-overview", title: "HR · Expense overview", description: "Spend for finance leads and approvers: a period filter, four totals, spend by category and by month, team budgets, and recent claims that open for approval.", Component: HrExpenseOverviewTemplate, source: hrExpenseOverviewTemplateSource, file: "src/templates/hr/HrExpenseOverviewTemplate.tsx" },
  { id: "hr-my-expenses", title: "HR · My expenses", description: "Your own claims: totals by status, a filtered and sortable claims table (a list with Bottom Sheets on a phone), a claim panel with its receipt and timeline, and a new expense form.", Component: HrMyExpensesTemplate, source: hrMyExpensesTemplateSource, file: "src/templates/hr/HrMyExpensesTemplate.tsx" },
  { id: "hr-my-leaves", title: "HR · My leaves", description: "Your time off: the next leave, a balance per leave type, every request with filters, a request panel with cancel and Undo, and a request form that counts working days.", Component: HrMyLeavesTemplate, source: hrMyLeavesTemplateSource, file: "src/templates/hr/HrMyLeavesTemplate.tsx" },
  { id: "hr-leave-types", title: "HR · Leave types", description: "The leave policies an HR admin manages: pay, allowance, carry-over and who it applies to, an Active toggle with Undo, and add, edit, duplicate and delete flows.", Component: HrLeaveTypesTemplate, source: hrLeaveTypesTemplateSource, file: "src/templates/hr/HrLeaveTypesTemplate.tsx" },
  { id: "hr-public-holiday", title: "HR · Public holidays", description: "Holidays per office country with flags and a year switch: the next holiday, days off and people covered, and a holiday table with edit, keep open and remove with Undo.", Component: HrPublicHolidayTemplate, source: hrPublicHolidayTemplateSource, file: "src/templates/hr/HrPublicHolidayTemplate.tsx" },
  { id: "hr-tasks", title: "HR · All tasks", description: "Tasks across the studio's spaces as a grouped list or a board: search and filters, a task panel, moving status (drag on the board) with Undo, and a new task form.", Component: HrTasksTemplate, source: hrTasksTemplateSource, file: "src/templates/hr/HrTasksTemplate.tsx" },
]);

/** The page's top panel: what the templates are and which files hold them (each one renders below with its code). */
function TemplatesPlayground() {
  return (
    <Panel title="Templates" previewClassName="patpl-preview" controls={<Text textStyle="Body/Small/Regular" tone="base">{plural(templates.length, "template")} · open “Code” on a template for its file</Text>} code={`// Copy a file from src/templates (shipped in the package) into your app.\n${templates.map((item) => `// ${item.file} — ${item.description}`).join("\n")}`}>
      <List aria-label="Templates">
        {templates.map((item) => <ListItem key={item.id} title={item.title} caption={<>{item.description} <Text as="span" textStyle="Body/Code/Regular" tone="light">{item.file.replace("src/templates/", "")}</Text></>} />)}
      </List>
    </Panel>
  );
}

function TemplateFrame({ template }: { template: TemplateDef }) {
  const { Component } = template;
  return template.mobile ? (
    <PlatformPhone className="patpl-phone" label={template.title}><ZenProvider typography="mobile" density="comfortable" paint={false} breakpoint="mobile"><Component /></ZenProvider></PlatformPhone>
  ) : (
    <div className="patpl-frame"><div className="patpl-frame__scroll"><ZenProvider paint portal={false} syncDocument={false} breakpoint="auto" className="patpl-app"><Component /></ZenProvider></div></div>
  );
}

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  templates: {
    label: "Templates",
    eyebrow: "Templates",
    title: "Page templates",
    description: "Complete screens built only from Zen components: copy one into your app, then replace the sample data. Each is type-checked and passes the usage harness.",
    playground: TemplatesPlayground,
  },
});

export const examples: ExampleMap = keepOnHotUpdate(import.meta.hot, "examples", {
  templates: templates.map((template) => ({ title: template.title, description: `${template.description} File: ${template.file}.`, wide: !template.mobile, screen: !template.mobile, render: () => <TemplateFrame template={template} />, code: template.source })),
});
