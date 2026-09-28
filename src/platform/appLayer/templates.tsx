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
import { ZenProvider } from "../../components/Provider";
import { PlatformPhone } from "../PlatformPhone";
import { Panel } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./templates.css";

type TemplateDef = { id: string; title: string; description: string; Component: ComponentType; source: string; file: string; mobile?: boolean };

/**
 * Page templates (src/templates): real, type-checked screens built only from Zen components. The code panel shows the
 * file itself (`?raw`), so it can never drift from what renders. They ship in the package as source to copy.
 */
export const templates: TemplateDef[] = [
  { id: "admin-list", title: "Admin list (Team members)", description: "AppShell + PageHeader, Search and multi-select filter chips, a sortable Table with row-action Menus, an invite ModalForm (useFormState), a confirm Dialog and toasts.", Component: AdminListTemplate, source: adminListSource, file: "src/templates/AdminListTemplate.tsx" },
  { id: "detail", title: "Detail page (Invoice)", description: "AppShell + PageHeader with Back, a status Badge, one Primary and a More Menu; Tabs; a main column (line items Table + DescriptionList totals) next to an aside (Grid \"2fr 1fr\"); a Record-payment ModalForm and a Void Dialog.", Component: DetailTemplate, source: detailSource, file: "src/templates/DetailTemplate.tsx" },
  { id: "dashboard", title: "Dashboard", description: "AppShell + PageHeader, metric cards, a chart, recent activity and a table.", Component: DashboardTemplate, source: dashboardSource, file: "src/templates/DashboardTemplate.tsx" },
  { id: "settings-form", title: "Settings form", description: "AppShell + PageHeader, a validated Form (useFormState) with a checkbox fieldset and sticky-safe actions, and an instant Toggle outside the Form.", Component: SettingsFormTemplate, source: settingsFormSource, file: "src/templates/SettingsFormTemplate.tsx" },
  { id: "sign-in", title: "Sign in", description: "A centred sign-in card: validated Form, a Forgot-password Link, SSO, and legal links in the caption.", Component: SignInTemplate, source: signInSource, file: "src/templates/SignInTemplate.tsx" },
  { id: "mobile-list", title: "Mobile list with filters", description: "Phone list: Search, filter chips that open Action BottomSheets, status badges and an empty state.", Component: MobileListTemplate, source: mobileListSource, file: "src/templates/MobileListTemplate.tsx", mobile: true },
  { id: "mobile-detail", title: "Mobile detail (Order)", description: "Phone detail screen: sticky TopNavigation with Back, a vertical Stepper, a List with Thumbnails, DescriptionList totals and details, and a sticky ActionBar whose Get help opens an Action BottomSheet.", Component: MobileDetailTemplate, source: mobileDetailSource, file: "src/templates/MobileDetailTemplate.tsx", mobile: true },
  { id: "empty-error", title: "Empty & error states", description: "404 page, search without results, first use and a failed load with Retry.", Component: EmptyErrorTemplate, source: emptyErrorSource, file: "src/templates/EmptyErrorTemplate.tsx" },
];

/** The page's top panel: what the templates are and which files hold them (each one renders below with its code). */
function TemplatesPlayground() {
  return (
    <Panel title="Templates" previewClassName="patpl-preview" controls={<Text textStyle="Body/Small/Regular" tone="base">{plural(templates.length, "template")} · open “Code” on a template for its file</Text>} code={`// Copy a file from src/templates (shipped in the package) into your app.\n${templates.map((item) => `// ${item.file} — ${item.description}`).join("\n")}`}>
      <List aria-label="Templates">
        {templates.map((item) => <ListItem key={item.id} title={item.title} caption={item.description} trailing={<Text as="span" textStyle="Body/Code/Regular" tone="light">{item.file.replace("src/templates/", "")}</Text>} />)}
      </List>
    </Panel>
  );
}

function TemplateFrame({ template }: { template: TemplateDef }) {
  const { Component } = template;
  return template.mobile ? (
    <PlatformPhone className="patpl-phone" label={template.title}><ZenProvider typography="mobile" density="comfortable" paint={false} breakpoint="mobile"><Component /></ZenProvider></PlatformPhone>
  ) : (
    <div className="patpl-frame"><ZenProvider paint portal={false} syncDocument={false} breakpoint="auto" className="patpl-app"><Component /></ZenProvider></div>
  );
}

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = {
  templates: {
    label: "Templates",
    eyebrow: "Templates",
    title: "Page templates",
    description: "Complete screens built only from Zen components: copy one into your app, then replace the sample data. Each is type-checked and passes the usage harness.",
    playground: TemplatesPlayground,
  },
};

export const examples: ExampleMap = {
  templates: templates.map((template) => ({ title: template.title, description: `${template.description} File: ${template.file}.`, wide: true, screen: !template.mobile, render: () => <TemplateFrame template={template} />, code: template.source })),
};
