import { useId, useState } from "react";
import { Card, Divider, FormFieldset, Grid, Heading, Stack, Text, Toggle, useToast } from "@zen-ds/react";

type Setting = { id: string; label: string; caption: string };
const settingGroups: { id: string; title: string; summary: string; settings: Setting[] }[] = [
  {
    id: "email", title: "Email", summary: "Sent to alex@dizai.studio.", settings: [
      { id: "digest", label: "Daily digest", caption: "One email at 8:00 am with what changed yesterday" },
      { id: "mentions", label: "Mentions and replies", caption: "When someone mentions you or answers your comment" },
      { id: "invoices", label: "Paid invoices", caption: "When a client pays an invoice you sent" },
    ],
  },
  {
    id: "push", title: "Mobile push", summary: "On the Zen app for iOS and Android.", settings: [
      { id: "assigned", label: "Tasks assigned to me", caption: "Right away, during your working hours" },
      { id: "reviews", label: "Review requests", caption: "When a file or task waits for your review" },
      { id: "leave", label: "Time off requests", caption: "When someone on the Design team asks for leave" },
    ],
  },
];

/** Settings section: a Border card frames a group of toggles. */
export default function NotificationSettings() {
  const { toast } = useToast();
  const [on, setOn] = useState<Record<string, boolean>>({ digest: true, mentions: true, invoices: false, assigned: true, reviews: true, leave: false });
  const flip = (setting: Setting, checked: boolean) => {
    setOn((state) => ({ ...state, [setting.id]: checked }));
    toast({ title: `${setting.label} turned ${checked ? "on" : "off"}`, action: { label: "Undo", onClick: () => setOn((state) => ({ ...state, [setting.id]: !checked })) } });
  };
  const baseId = useId();
  return (
    // A flat settings page (Canvas/Flat: page and bars one plane in both modes, AppShell canvas="flat"): its cards are
    // Flat-Border (Surface/Flat in a Pale frame).
    <Stack gap="xl">
      {settingGroups.map((group, index) => {
        const titleId = `${baseId}-${group.id}`;
        return (
          <Stack key={group.id} gap="xl">
            {index > 0 ? <Divider /> : null}
            <Grid as="section" aria-labelledby={titleId} columns={{ mobile: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} gap="lg" align="start" stackBelow={640}>
              <Stack gap="xs">
                <Heading level={4} id={titleId} textStyle="Heading/4">{group.title}</Heading>
                <Text textStyle="Body/Small/Regular" tone="base">{group.summary}</Text>
              </Stack>
              <Card theme="flat-border">
                {/* A toggle group: each switch lines up on the card's right edge. */}
                <FormFieldset kind="toggle" legend={group.title} hideLegend>
                  {group.settings.map((setting) => (
                    <Toggle key={setting.id} size="md" label={setting.label} caption={setting.caption}
                      checked={on[setting.id]} onCheckedChange={(checked) => flip(setting, checked)} />
                  ))}
                </FormFieldset>
              </Card>
            </Grid>
          </Stack>
        );
      })}
    </Stack>
  );
}
