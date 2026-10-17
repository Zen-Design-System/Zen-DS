// Every element violates exactly one rule; the rule id is in the comment on the line above.
export const Bad = () => <>
  {/* expect: button/secondary-justified */}
  <Button level="secondary" onClick={share}>Share</Button>
  {/* expect: button/filter-is-chip */}
  <Button level="tertiary" aria-haspopup="listbox" onClick={openSort}>Sort: Name</Button>
  {/* expect: button/accent-is-promoted */}
  <Button level="accent" onClick={save}>Save</Button>
  {/* expect: button/destructive-is-danger */}
  <Button level="primary" onClick={remove}>Delete project</Button>
  {/* expect: icon-button/needs-name */}
  <IconButton onClick={act} level="tertiary" icon={<Icon name="icon-plus-line" />} />
  {/* expect: input/no-disabled */}
  <AutocompleteField label="Tags" options={tags} disabled />
  {/* expect: input/needs-label */}
  <SelectField options={[]} />
  {/* expect: search/needs-name */}
  <Search />
  {/* expect: choice/needs-label */}
  <Checkbox checked={on} onChange={setOn} />
  {/* expect: radio/needs-name */}
  <RadioButton label="Monthly" checked />
  {/* expect: chip/popover-needs-advanced */}
  <Chip variant="normal" popoverItems={items}>Status</Chip>
  {/* expect: removable/needs-handler */}
  <Badge remove>Design</Badge>
  {/* expect: badge-counter/cap */}
  <BadgeCounter value={124} />
  {/* expect: avatar/needs-alt */}
  <Avatar theme="photo" src={url} />
  {/* expect: avatar/solid-initials-contrast */}
  <Avatar theme="green" alt="Ava Chen">AC</Avatar>
  {/* expect: avatar/solid-initials-contrast */}
  <Avatar theme="cyan" background="solid" alt="Minh Tran" />
  {/* expect: tooltip/focusable-trigger */}
  <Tooltip content="Help"><span>?</span></Tooltip>
  {/* expect: tooltip/short */}
  <Tooltip content="This tooltip explains far too much about the feature and should really be inline help or a popover"><IconButton onClick={act} aria-label="Info" icon={<Icon name="icon-info-circle-line" />} /></Tooltip>
  {/* expect: tabs/needs-label */}
  <Tabs items={tabs} value={tab} onChange={setTab} />
  {/* expect: segmented/needs-label */}
  <Segmented options={views} value={view} onChange={setView} />
  {/* expect: dialog/needs-title */}
  <Dialog open={open} onOpenChange={setOpen} primaryAction={{ label: "OK" }} />
  {/* expect: dialog/negative-uses-danger */}
  <Dialog open={open} onOpenChange={setOpen} theme="negative" title="Delete?" primaryAction={{ label: "Delete" }} />
  {/* expect: popover/controlled-close */}
  <Popover open={open} items={items} onSelect={pick} />
  {/* expect: popover/explicit-open */}
  <Popover items={items} label="Assignee" onSelect={pick} />
  {/* expect: page-header/one-primary — also expect: button/one-primary (the two Primaries are siblings) */}
  <PageHeader title="Members" actions={<><Button level="primary" onClick={exportCsv}>Export</Button><Button level="primary" onClick={invite}>Invite member</Button></>} />
  {/* expect: dashboard-header/count-body */}
  <DashboardHeader search={<Search placeholder="Search expenses" />} subheading={<Text textStyle="Heading/Subheading">86 expenses</Text>} />
  {/* expect: dashboard-header/count-body */}
  <DashboardHeader search={<Search placeholder="Search expenses" />} subheading={<Heading level={2}>86 expenses</Heading>} />
  {/* expect: dashboard-header/props-of-type */}
  <DashboardHeader type="navigation" leading={<Breadcrumbs items={crumbs} onNavigate={go} />} search={<Search placeholder="Search leave requests" />} />
  {/* expect: dashboard-header/one-primary — also expect: button/one-primary (the two Primaries are siblings) */}
  <DashboardHeader actions={<><Button level="primary" onClick={exportCsv}>Export</Button><Button level="primary" onClick={submitLeave}>Submit leave</Button></>} />
  {/* expect: dashboard-header/main-needs-title */}
  <DashboardHeader type="main" actions={<Button level="primary" onClick={submitLeave}>Submit leave</Button>} />
  {/* expect: dashboard-header/filters-are-chips */}
  <DashboardHeader search={<Search placeholder="Search leave requests" />} controls={<Button level="tertiary" onClick={openStatus}>Status</Button>} />
  {/* expect: app-shell/primary-in-top-bar */}
  <AppShell sidebar={nav} headerActions={<Button level="primary" onClick={invite}>Invite member</Button>}><Container>{page}</Container></AppShell>
  {/* expect: app-shell/nested */}
  <AppShell sidebar={nav}><AppShell sidebar={nav}><Container>{page}</Container></AppShell></AppShell>
  {/* expect: app-shell/breadcrumbs-once */}
  <AppShell sidebar={nav} header={<Breadcrumbs master={false} items={crumbs} onNavigate={go} />}><PageHeader title="Invoices" breadcrumbs={<Breadcrumbs items={crumbs} onNavigate={go} />} /></AppShell>
  {/* expect: app-shell/page-header-in-sections */}
  <AppShell sidebar={nav} topNavigation={<TopNavigation title="Invoices" />}><Container><PageHeader title="Invoices" /></Container></AppShell>
  {/* expect: app-shell/top-navigation-title */}
  <AppShell sidebar={nav} sections={<PageHeader title="Invoices" />} topNavigation={<TopNavigation title="Billing" />}><Container>{page}</Container></AppShell>
  {/* expect: form/actions-order */}
  <FormActions><Button level="primary" type="submit">Save changes</Button><Button level="tertiary" onClick={cancel}>Cancel</Button></FormActions>
  {/* expect: form/submit-button */}
  <FormActions><Button level="tertiary" onClick={cancel}>Cancel</Button><Button level="primary" onClick={save}>Save changes</Button></FormActions>
  {/* expect: form/toggle-outside-form */}
  <Form form={form}><Toggle label="Weekly digest" selected={digest} onSelectedChange={setDigest} /></Form>
  {/* expect: form-fieldset/needs-legend */}
  <FormFieldset kind="checkbox"><Checkbox label="Releases" checked={on} onChange={setOn} /></FormFieldset>
  {/* expect: form-fieldset/radio-kind */}
  <FormFieldset legend="Delivery"><RadioButton name="delivery" label="Standard" checked /></FormFieldset>
  {/* expect: link/needs-href */}
  <Link onClick={openDialog}>Delete project</Link>
  {/* expect: link/vague-text */}
  <Link href="/pricing">Learn more</Link>
  {/* expect: link/new-tab-is-external */}
  <Link href="https://status.zen.design" target="_blank">Status page</Link>
  {/* expect: link/inherit-needs-underline */}
  <Link href="/legal/terms" tone="inherit" underline="hover">Terms of service</Link>
  {/* expect: menu/not-for-selection */}
  <Menu trigger={sortTrigger} items={[{ id: "name", label: "Name", selected: true }, { id: "date", label: "Date modified" }]} onSelect={sortBy} />
  {/* expect: menu/needs-trigger */}
  <Menu items={rowActions} onSelect={run} />
  {/* expect: box/border-matches-action */}
  <Box border="subtle" padding="md">Static notes</Box>
  {/* expect: progress/needs-label */}
  <ProgressBar value={40} />
  {/* expect: toast/needs-title */}
  <Toast type="positive">Saved</Toast>
  {/* expect: alert-banner/small-no-action */}
  <AlertBanner size="small" action={{ label: "Fix", onClick: fix }}>Payment failed</AlertBanner>
  {/* expect: button/vague-label */}
  <Button level="tertiary" onClick={confirm}>OK</Button>
  {/* expect: button/one-primary */}
  <Button level="primary" onClick={saveDraft}>Save draft</Button>
  <Button level="primary" onClick={publish}>Publish</Button>
  {/* expect: toggle/label-names-setting */}
  <Toggle label="On" selected={on} onSelectedChange={setOn} />
  {/* expect: tooltip/no-interactive-content */}
  <Tooltip content={<Button level="tertiary" onClick={learnMore}>Learn more</Button>}><IconButton onClick={act} aria-label="Info" icon={<Icon name="icon-info-circle-line" />} /></Tooltip>
  {/* expect: tooltip/disabled-trigger */}
  <Tooltip content="Upgrade to export"><Button level="tertiary" disabled>Export</Button></Tooltip>
  {/* expect: tabs/item-count */}
  <Tabs aria-label="Solo" items={[{ id: "one", label: "Overview" }]} />
  {/* expect: segmented/option-count */}
  <Segmented aria-label="Range" options={[{ id: "d", label: "D" }, { id: "w", label: "W" }, { id: "m", label: "M" }, { id: "q", label: "Q" }, { id: "y", label: "Y" }, { id: "all", label: "All" }]} />
  {/* expect: chip/multiple-needs-count */}
  <Chip variant="advanced" selectionMode="multiple" popoverItems={items} onPopoverSelect={toggleOwner} popoverMultiple>Owner</Chip>
  {/* expect: dialog/no-nested */}
  <Dialog open={open} onOpenChange={setOpen} title="Settings"><Dialog open title="Confirm" /></Dialog>
  {/* expect: accordion/no-nested */}
  <Accordion title="Billing"><Accordion title="Invoices">Monthly PDFs</Accordion></Accordion>
  {/* expect: pagination/worth-paging */}
  <Pagination page={1} onPageChange={setPage} pageCount={2} />
  {/* expect: progress/value-range */}
  <ProgressBar value={140} label />
  {/* expect: toast/concise */}
  <Toast title="Delete this file?" />
  {/* expect: input/placeholder-not-label */}
  <InputField label="Email" placeholder="Email" />
  {/* expect: sidebar/submenu-close */}
  <Sidebar sections={sections} subMenu={<SidebarSubMenu items={subItems} />} subMenuLabel="Projects" />
  {/* expect: divider/no-double */}
  <Divider />
  <Divider color="medium" />
  {/* expect: shape/token-paint */}
  <Shape type="ellipse" width={80} height={80} fill="#FF6B00" />
  <Stack>
    {/* expect: shape/px-offset-in-auto-layout */}
    <Shape position="absolute" insetLeft={24} insetTop={12} width={40} height={40} />
  </Stack>
  {/* expect: shape/line-no-height */}
  <Shape type="line" width={120} height={2} />
  {/* expect: inline-message/needs-content */}
  <InlineMessage theme="info" />
  {/* expect: inline-message/custom-needs-visual */}
  <InlineMessage theme="custom" title="New: Figma sync" />
  {/* expect: empty-state/needs-title */}
  <EmptyState primaryAction={{ label: "Create project", onClick: create }} />
  {/* expect: empty-state/action-label */}
  <EmptyState title="No projects" primaryAction={{ label: "OK", onClick: create }} />
  {/* expect: table/actions-flat */}
  <TableActions><IconButton onClick={act} aria-label="Actions for Ava" icon={<Icon name="icon-dots-horizontal-line" />} /></TableActions>
  {/* expect: empty-state/way-out-tertiary */}
  <EmptyState title="No members match" size="sm" primaryAction={{ label: "Clear filters", onClick: reset }} />
  {/* expect: empty-state/keep-illustration */}
  <EmptyState title="No files yet" illustration={false} primaryAction={{ label: "Upload file", onClick: upload }} />
  {/* Catalogue cards sit in their own <div>: side by side they would read as one group (card/spacing-by-count). */}
  {/* expect: empty-state/small-in-box */}
  <div><Card theme="border"><EmptyState title="No invoices yet" headingLevel={4} primaryAction={{ label: "Create invoice", onClick: create }} /></Card></div>
  {/* expect: stepper/needs-label */}
  <Stepper steps={steps} current={1} />
  {/* expect: stepper/step-count */}
  <Stepper aria-label="Solo" steps={[{ id: "only", title: "Only step" }]} />
  {/* expect: slider/needs-name */}
  <Slider value={v} onChange={setV} />
  {/* expect: slider/white-no-small */}
  <Slider aria-label="Brightness" theme="white" size="small" />
  {/* expect: slider/solid-icon */}
  <Slider aria-label="Volume" icon="icon-volume-max-line" />
  {/* expect: richtext/value-not-onchange */}
  <RichTextField label="Announcement" onChange={handle} />
  {/* expect: card/clickable-no-nested-controls */}
  <div><Card onClick={open}><Button level="tertiary" onClick={edit}>Edit</Button></Card></div>
  {/* expect: card/on-container-in-overlay */}
  <SidePanel open={open} onOpenChange={setOpen} title="Edit project" primaryAction={{ label: "Save changes" }}><Card theme="border">Brief</Card></SidePanel>
  {/* expect: card/color-ignored */}
  <div><Card theme="flat" color="brand">Revenue</Card></div>
  {/* expect: card/color-ignored */}
  <MetricCard color="cyan" label="Invoiced" value="$48,200" />
  {/* expect: card/solid-color */}
  <div><Card theme="solid" color="green">Collected</Card></div>
  {/* expect: card/solid-color */}
  <div><Card theme="pale" color="accent">Payout</Card></div>
  {/* expect: card/surface-ignored */}
  <div><Card theme="flat" surface="flat">Hours</Card></div>
  {/* expect: card/surface-ignored */}
  <ChartCard title="Revenue" theme="pale" surface="alt"><LineChart aria-label="Revenue per month" data={[{ label: "Sep", value: 1 }]} /></ChartCard>
  {/* On a phone (card/spacing-by-count judges PlatformPhone frames and BottomSheets only). */}
  {/* expect: card/spacing-by-count */}
  <PlatformPhone label="Home"><Grid columns={3} gap="md"><Card>Inside</Card><Card spacing="small">Humidity</Card><Card spacing="small">kWh today</Card></Grid></PlatformPhone>
  {/* expect: card/spacing-by-count */}
  <PlatformPhone label="Home"><Grid columns={3} gap="md">{["Inside", "Humidity", "kWh today"].map((label) => <Card key={label}>{label}</Card>)}</Grid></PlatformPhone>
  {/* expect: card/spacing-by-count */}
  <PlatformPhone label="Home"><Stack gap="md"><Card spacing="small">Devices</Card></Stack></PlatformPhone>
  {/* expect: card/spacing-by-count */}
  <PlatformPhone label="Energy"><Grid columns={3} gap="sm"><MetricCard label="Today" value="12 kWh" /><MetricCard spacing="small" label="Week" value="80 kWh" /><MetricCard spacing="small" label="Month" value="320 kWh" /></Grid></PlatformPhone>
  {/* expect: listbox/on-container-in-overlay */}
  <Dialog open={open} onOpenChange={setOpen} title="Members"><ListBox><List aria-label="Members"><ListItem title="Ava Chen" /></List></ListBox></Dialog>
  {/* expect: listbox/footer-action-tertiary */}
  <ListBox footer={<Link href="/time-off/calendar">Open calendar</Link>}><List aria-label="Out this week"><ListItem title="Sarah Kim" /></List></ListBox>
  {/* expect: listbox/footer-action-tertiary */}
  <ListBox footer={<Text textStyle="Body/Base/Regular" tone="base">Go to Inbox</Text>}><List aria-label="Messages"><ListItem title="Sarah Kim" /></List></ListBox>
  {/* expect: listbox/footer-action-tertiary */}
  <ListBox footer={<Button level="primary" onClick={openInbox}>Go to Inbox</Button>}><List aria-label="Messages"><ListItem title="Sarah Kim" /></List></ListBox>
  {/* expect: listbox/footer-action-tertiary */}
  <ListBox footer={<Stack align="start"><Button level="tertiary" onClick={showAll}>Show all files</Button></Stack>}><List aria-label="Recent files"><ListItem title="Brief.pdf" /></List></ListBox>
  {/* expect: list-item/switch-row */}
  <ListItem title="Daily digest" trailing={<ToggleButton aria-label="Daily digest" />} />
  {/* expect: chip/radio-is-chip-group */}
  <Chip variant="normal" role="radio" aria-checked onClick={act}>Daily</Chip>
  {/* expect: list-item/clickable-row-toggle */}
  <ListItem title="Wi-Fi" onClick={open} trailing={<ToggleButton aria-label="Wi-Fi" selected={on} onSelectedChange={setOn} />} />
  {/* expect: voice/actions-wired */}
  <VoiceRecorder state="ready" onRecord={record} />
  {/* expect: voice/actions-wired */}
  <AiVoiceConversation state="ready" onStart={listen} />
  {/* expect: dock-icon/emoji-needs-glyph */}
  <DockIcon theme="emoji" />
  {/* expect: table/needs-name */}
  <Table rows={rows} getRowId={getId} columns={columns} />
  {/* expect: table/interaction-needs-handler */}
  <Table aria-label="Files" rows={rows} getRowId={getId} columns={columns} selectable selectedIds={ids} />
  {/* expect: list-item/trailing-button-medium */}
  <ListItem title="Ava Chen" trailing={<IconButton onClick={act} size="sm" aria-label="Message" icon={<Icon name="icon-mail-01-line" />} />} />
  {/* expect: table/editor-needs-commit */}
  <Table aria-label="Stock" rows={rows} getRowId={getId} columns={[{ id: "name", header: "Name", cell: render, edit: { value: getName } }]} />
  {/* expect: table/editor-number-right */}
  <Table aria-label="Stock" rows={rows} getRowId={getId} columns={[{ id: "qty", header: "Qty", cell: render, edit: { type: "number", value: getQty, onCommit: save, validate: check } }]} />
  {/* expect: table/editor-number-validate */}
  <Table aria-label="Stock" rows={rows} getRowId={getId} columns={[{ id: "qty", header: "Qty", align: "right", cell: render, edit: { type: "number", value: getQty, onCommit: save } }]} />
  {/* expect: rating/needs-name */}
  <Rating value={stars} onChange={setStars} />
  {/* expect: metric/formatted-value */}
  <Metric label="Revenue" value={1680.68} />
  {/* expect: metric/type-data */}
  <MetricCard type="sparkline" label="Revenue" value="$105,700" />
  {/* expect: metric/type-data */}
  <MetricCard label="Revenue" value="$105,700" series={[61, 66, 64, 73]} />
  {/* expect: metric/category-count */}
  <MetricCard type="category-bar" label="Invoices" value="$184,200" categories={[{ id: "paid", label: "Paid", value: 184200 }]} />
  {/* expect: uploader/needs-label */}
  <FileUpload caption="PDF only" onFilesAdd={add} />
  {/* expect: uploader/accept-caption */}
  <FileUpload label="Contract" accept="application/pdf" onFilesAdd={add} />
  {/* expect: side-panel/not-for-confirmations */}
  <SidePanel open={open} onOpenChange={setOpen} title="Delete project" primaryAction={{ label: "Delete project" }} />
  {/* expect: button/flat-level */}
  <IconButton onClick={act} appearance="flat" level="tertiary" size="sm" aria-label="Close" icon={<Icon name="icon-x-small-line" />} />
  {/* expect: flag/unknown-name */}
  <Flag name="Viet Nam" />
  {/* expect: flag/no-emoji-flag */}
  <TableMedia media={<DockIcon theme="emoji" emoji="🇻🇳" size="xs" />}>Vietnam</TableMedia>
  {/* expect: file-icon/not-an-action */}
  <IconButton onClick={act} appearance="flat" level="primary" aria-label="Download" icon={<FileIcon format="pdf" />} />
  {/* expect: button/small-full-width  expect: button/compact-size-special */}
  <div style={{ display: "flex", flexDirection: "column" }}><Button level="tertiary" size="xs" onClick={simulate}>Simulate an upload</Button></div>
  {/* expect: button/small-full-width */}
  <Button level="primary" size="sm" style={{ width: "100%" }} onClick={save}>Save changes</Button>
  {/* expect: button/small-full-width */}
  <div className="pe-stack"><Button level="primary" size="sm" style={{ alignSelf: "flex-start" }} onClick={reserve}>Reserve</Button></div>
  {/* expect: table/title-heading-4 */}
  <Text textStyle="Body/Base/Bold">Invoices</Text>
  <Table aria-label="Invoices" columns={[]} rows={[]} getRowId={(r) => r.id} />
  {/* A paragraph styled like a section title is still not a heading (not in the outline). */}
  {/* expect: table/title-heading-4 */}
  <Text textStyle="Heading/4">Invoices</Text>
  <Table aria-label="Invoices" columns={[]} rows={[]} getRowId={(r) => r.id} />
  {/* expect: table/title-heading-4 */}
  <Heading level={2} textStyle="Heading/Subheading">Invoices</Heading>
  <Table aria-label="Invoices" columns={[]} rows={[]} getRowId={(r) => r.id} />
  {/* A widget Card titles its table with the widget title: Heading/Subheading, not the page-section Heading/4. */}
  <div><Card>
    {/* expect: table/title-heading-4 */}
    <Heading level={2} textStyle="Heading/4">Recent claims</Heading>
    <Table aria-label="Recent claims" columns={[]} rows={[]} getRowId={(r) => r.id} />
  </Card></div>
  {/* expect: top-navigation/max-three-trailing */}
  <TopNavigation title="Files" trailing={[{ icon: "icon-plus-line", label: "Add", onClick: add }, { icon: "icon-share-01-line", label: "Share", onClick: share }, { icon: "icon-star-01-line", label: "Favourite", onClick: favourite }, { icon: "icon-trash-line", label: "Delete", onClick: remove }]} />
  {/* expect: top-navigation/max-three-trailing */}
  <TopNavigation title="Files" largeTitle="Files" largeTitleAction={[{ icon: "icon-plus-line", label: "Add", onClick: add }, { icon: "icon-share-01-line", label: "Share", onClick: share }, { icon: "icon-star-01-line", label: "Favourite", onClick: favourite }, { icon: "icon-trash-line", label: "Delete", onClick: remove }]} />
  {/* expect: bottom-navigation/destinations */}
  <BottomNavigation value="a" onValueChange={go} items={[{ id: "a", label: "Home", icon: "icon-home-smile-line" }, { id: "b", label: "Me", icon: "icon-user-line" }]} />
  {/* expect: bottom-sheet/choice-uses-list-item */}
  <BottomSheet open={open} onOpenChange={setOpen} title="Sort by" type="action" items={sorts} selectedId={sort} onSelect={pick} />
  {/* expect: bottom-sheet/action-needs-items */}
  <BottomSheet open={open} onOpenChange={setOpen} type="action" title="Share" />
  {/* expect: chat/others-need-author */}
  <ChatMessage side="others" onReact={react}>Hi there</ChatMessage>
  {/* expect: ai-chat/no-actions-while-streaming */}
  <AiChatBubble side="ai" streaming actions={[{ icon: "icon-copy-line", label: "Copy", onClick: copy }]}>Working</AiChatBubble>
  {/* expect: chart/stack-needs-legend */}
  <StackBarChart aria-label="Budget" data={data} series={series} showLegend={false} />
  {/* expect: chart/needs-name */}
  <BarChart data={data} />
  {/* expect: chart/shares-need-legend */}
  <DonutChart aria-label="Revenue by client, Q3 2026" data={slices} showLegend={false} />
  {/* expect: chart/ring-size-named */}
  <RadialChart aria-label="Budget used by project" data={slices} size={200} />
  {/* expect: chart/shares-need-legend */}
  <LineChart aria-label="Invoiced and collected, Apr – Sep 2026" data={data} compare={compare} showLegend={false} />
  {/* expect: chart/heatmap-needs-scale */}
  <HeatmapChart aria-label="Hours logged by weekday and hour" rows={rows} columns={columns} values={values} showLegend={false} />
  {/* expect: chart/needs-name */}
  <BarList data={ranking} />
  {/* expect: chart/bar-list-rows */}
  <BarList aria-label="Revenue by client, 2026 so far" data={[{ label: "A", value: 9 }, { label: "B", value: 8 }, { label: "C", value: 7 }, { label: "D", value: 6 }, { label: "E", value: 5 }, { label: "F", value: 4 }, { label: "G", value: 3 }, { label: "H", value: 2 }, { label: "I", value: 1 }]} />
  {/* expect: chart/bar-list-ranked */}
  <BarList aria-label="Revenue by client, 2026 so far" data={[{ label: "Phin & Co", value: 71200 }, { label: "Lumen Bank", value: 96400 }, { label: "Mekong Freight", value: 54800 }]} />
  {/* expect: chart/bullet-rows */}
  <BulletChart aria-label="Quarter goals, Q3 2026" data={[{ label: "Revenue", value: 798, target: 900 }, { label: "New clients", value: 18, target: 24 }, { label: "Utilisation", value: 82, target: 85 }, { label: "Churn", value: 3, target: 2 }, { label: "NPS", value: 41, target: 50 }]} />
  {/* expect: chart/needs-name */}
  <GaugeChart value={82} target={85} />
  {/* expect: chart/gauge-in-range */}
  <GaugeChart aria-label="Billable hours, September 2026" value={1052} target={1091} />
  {/* expect: chart/funnel-stages */}
  <FunnelChart aria-label="Leads to signed projects, Q3 2026" data={[{ label: "Leads", value: 480 }, { label: "Signed", value: 62 }]} />
  {/* expect: chart/needs-name */}
  <AreaChart data={data} series={series} />
  {/* expect: chart/series-need-legend */}
  <GroupedBarChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={data} series={series} showLegend={false} />
  {/* expect: chart/series-need-legend */}
  <AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026" data={data} series={series} showLegend={false} />
  {/* expect: chart/area-series-count */}
  <AreaChart type="stacked" aria-label="Billable hours per month, Apr – Sep 2026" data={data} series={[{ id: "hours", label: "Billable hours" }]} />
  {/* expect: chart/area-series-count */}
  <AreaChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={data} series={[{ id: "invoiced", label: "Invoiced" }, { id: "collected", label: "Collected" }]} />
  {/* expect: chart/grouped-series-count */}
  <GroupedBarChart aria-label="Billable hours per month by team, Apr – Sep 2026" data={data} series={[{ id: "a", label: "Design" }, { id: "b", label: "Engineering" }, { id: "c", label: "Delivery" }, { id: "d", label: "Client Services" }]} />
  {/* expect: chart/combo-needs-labels */}
  <ComboChart aria-label="Revenue and margin per month, Apr – Sep 2026" data={combo} barLabel="Revenue" lineLabel="" />
  {/* expect: chart/funnel-stages */}
  <FunnelChart aria-label="Leads to signed projects, Q3 2026" data={[{ label: "Leads", value: 480 }, { label: "Proposal", value: 168 }, { label: "Qualified", value: 312 }, { label: "Signed", value: 62 }]} />
  {/* expect: table/media-size-by-subtext */}
  <TableMedia media={<Avatar size="small" theme="photo" src={photo} alt="" />}>Ava Chen</TableMedia>
  {/* expect: uploader/no-noop-replace */}
  <FileUpload label="Avatar" caption="PNG or JPG. Max 2 MB" accept="image/*" files={files} onReplace={() => {}} />
  {/* expect: badge/count-uses-counter */}
  <Badge size="small">12</Badge>
  {/* expect: button/filter-is-chip */}
  <Button level="tertiary" size="sm" startIcon={<Icon name="icon-filter-lines-line" decorative />} onClick={openFilters}>All filters</Button>
  {/* expect: progress/quota-scale */}
  <ProgressBar value={92} theme="status" label="Storage · 92% used" />
  {/* expect: segmented/icon-only-needs-name */}
  <Segmented level="secondary" aria-label="View" value={view} onChange={setView} options={[{ id: "grid", label: null, leading: <Icon name="icon-grid-01-line" decorative /> }, { id: "list", label: null, leading: <Icon name="icon-list-line" decorative /> }]} />
  {/* expect: slider-field/value-in-range */}
  <SliderField label="Overlay Opacity" defaultValue={60} min={0} max={1} step={0.01} />
  {/* expect: curve-preview/bounce-range */}
  <CurvePreview type="ease-out" bounce={0.3} />
  {/* expect: curve-preview/bounce-range */}
  <CurvePreview type="spring" bounce={30} />
  {/* expect: color-picker/hex-value */}
  <ColorField label="Brand colour" defaultValue="royalblue" />
  {/* expect: color-picker/hex-value */}
  <ColorPicker aria-label="Shadow tint" savedColors={["#000000", "var(--zen-color-background-support-blue-solid)"]} />
  {/* expect: color-selector/token-values */}
  <ColorSelector aria-label="Label colour" colors={[{ value: "#2563eb", label: "Blue" }, { value: "#16a34a", label: "Green" }]} />
  {/* expect: icon/size-token */}
  <Icon name="icon-check-line" size="small" decorative />
  {/* expect: icon-button/needs-action */}
  <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot />
  {/* expect: icon-button/needs-action */}
  <AppShellAccount name="Ava Chen" />
  {/* expect: copy/plural-count */}
  <Text tone="light">{results.length} places</Text>
  {/* expect: navigation/back-chevron */}
  <TopNavigation type="compact" title="Files" leading={{ icon: "icon-arrow-left-line", label: "Back", onClick: back }} />
  {/* expect: navigation/back-chevron */}
  <IconButton onClick={act} appearance="flat" level="primary" size="md" aria-label="Back" icon={<Icon name="icon-arrow-left-line" />} />
  {/* expect: ai-chat/no-actions-while-streaming */}
  <AiChatBubble side="ai" thinking actions={[{ icon: "icon-copy-line", label: "Copy", onClick: copy }]} />
  {/* expect: segmented/control-bar-full-width */}
  <TopNavigation type="compact" title="Files" controlBar={<Segmented options={tabs} value={tab} onChange={setTab} aria-label="Filter files" />} />
  {/* expect: popover/bulk-action-limit */}
  <PopoverBulkAction><PopoverBulkActionGroup><IconButton onClick={act} aria-label="Undo" icon={undo} /></PopoverBulkActionGroup></PopoverBulkAction>
  {/* expect: top-navigation/search-folds-to-action */}
  <TopNavigation title="Inbox" largeTitle="Inbox" collapsed={collapsed} controlBar={<Search placeholder="Search messages" />} />
  {/* expect: top-navigation/max-three-trailing */}
  <TopNavigation title="Inbox" collapsed={collapsed} controlBar={<Search placeholder="Search messages" />} searchAction={{ onClick: openSearch }} trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: compose }, { icon: "icon-star-01-line", label: "Starred", onClick: openStarred }, { icon: "icon-dots-horizontal-line", label: "More", onClick: openMore }]} />
  {/* expect: chat/hold-delete-destructive */}
  <ChatMessage side="you" holdActions={[{ id: "copy", label: "Copy", icon: "icon-copy-solid" }, { id: "delete", label: "Delete", icon: "icon-trash-solid" }]}>Hi</ChatMessage>
  {/* expect: icon-button/tooltip */}
  <IconButton onClick={act} appearance="flat" level="primary" size="md" aria-label="Archive" tooltip={false} icon={<Icon name="icon-archive-line" />} />
  {/* expect: button/icon-only-raw */}
  <button type="button" className="toolbar-action" aria-label="Archive" onClick={archive}><Icon name="icon-archive-line" decorative /></button>
  {/* expect: chat/reply-cancellable */}
  <ChatComposer onSend={send} replyTo={replying} />
  {/* expect: chat/no-locked-interaction */}
  <ChatMessage side="others" author={{ name: "Ava Chen" }}>Locked message</ChatMessage>
  {/* expect: chat/no-locked-interaction */}
  <ChatCall state="in-missed" detail="12:33" onAction={() => undefined} />
  {/* expect: chat/reactions-name-people */}
  <ChatMessage side="you" onReact={react} reactions={[{ kind: "heart", count: 3 }]}>Nice work</ChatMessage>
  {/* expect: image/needs-alt */}
  <Image src={photo} ratio="4:3" />
  {/* expect: image/alt-describes */}
  <Thumbnail src={photo} alt="IMG_2031.jpg" />
  {/* expect: action-bar/one-primary */}
  <ActionBar primaryAction={{ label: "Add to cart", onClick: add }}><Button level="primary" size="lg" onClick={() => buy()}>Buy now</Button></ActionBar>
  {/* expect: action-bar/primary-order */}
  <ActionBar><Button level="tertiary" size="lg" onClick={save}>Save for later</Button><Button level="primary" size="lg" onClick={add}>Add to cart</Button></ActionBar>
  {/* expect: action-bar/full-width-size */}
  <ActionBar><Button level="primary" size="sm" onClick={add}>Add to cart</Button></ActionBar>
  {/* expect: mobile/full-size-controls */}
  <PlatformPhone label="Settings"><Toggle label="Sync over Wi-Fi only" checked={wifi} onCheckedChange={setWifi} /></PlatformPhone>
  {/* expect: mobile/full-size-controls */}
  <BottomSheet open={open} onOpenChange={setOpen} title="Filters"><InputField label="Name" size="sm" value={name} onValueChange={setName} /></BottomSheet>
  {/* expect: visually-hidden/focusable-shows */}
  <VisuallyHidden as="a" href="#main">Skip to main content</VisuallyHidden>
  {/* expect: heading/h1-is-heading-1 */}
  <Heading level={1} textStyle="Heading/3">Billing</Heading>
  {/* A content h1 in a bar style: only the TopNavigation bar title (.zen-top-nav__title) keeps Body/Extra/Bold. */}
  {/* expect: heading/h1-is-heading-1 */}
  <h1 className={typographyStyles["Body/Extra/Bold"]}>Order #1042</h1>
  {/* expect: heading/h1-is-heading-1 */}
  <Text as="h1">Billing</Text>
  {/* expect: heading/title-not-light */}
  <Heading level={2} tone="light">Recent activity</Heading>
  {/* expect: heading/title-not-light */}
  <Heading tone="tertiary">Recent activity</Heading>
  {/* expect: description-list/one-emphasis */}
  <DescriptionList items={[{ term: "Subtotal", description: "$311.90", emphasis: true }, { term: "Total", description: "$321.90", emphasis: true }]} />
  {/* expect: icon/unknown-name */}
  <Icon name="icon-close-line" />
  {/* expect: icon/unknown-name */}
  <IconButton icon="icon-delete-bin-line" aria-label="Delete draft" level="tertiary" onClick={remove} />
  {/* expect: icon-button/needs-action */}
  <IconButton icon="icon-share-01-line" aria-label="Share" level="tertiary" />
  {/* Size rules read both spellings (short sm/md… and Figma small/medium…). */}
  {/* expect: alert-banner/small-no-action */}
  <AlertBanner size="sm" action={<Button level="tertiary" size="sm" onClick={retry}>Retry</Button>}>Sync failed.</AlertBanner>
  {/* expect: slider/white-no-small */}
  <Slider theme="white" size="sm" aria-label="Brightness" />
  {/* expect: action-bar/full-width-size */}
  <ActionBar><Button level="primary" size="small" onClick={add}>Add to cart</Button></ActionBar>
  {/* Locked interactions (behaviour probes 2026-09-28): the field ignores ↑/↓, Upgrade does nothing. */}
  {/* expect: interaction/no-noop-handler */}
  <NumberField label="Width" value={width} onValueChange={() => undefined} />
  {/* expect: interaction/no-noop-handler */}
  <Toast type="warning" title="Storage almost full" action={{ label: "Upgrade", onClick: () => {} }}>You have used 92% of your space.</Toast>
  {/* Controlled without a handler: Previous/Next never move the month; the page-size chip picks nothing. */}
  {/* expect: interaction/controlled-needs-handler */}
  <DatePicker value={date} onValueChange={setDate} month={new Date(1995, 5, 1)} />
  {/* expect: interaction/controlled-needs-handler */}
  <DatePicker selectionMode="range" range={period} />
  {/* Actions without onApply: Cancel and Submit cannot differ, and the app never hears what was applied. */}
  {/* expect: date-picker/actions-need-apply */}
  <DatePicker calendar="dual" selectionMode="range" showActions onRangeChange={setRange} />
  {/* expect: interaction/controlled-needs-handler */}
  <Pagination theme="inline" page={page} onPageChange={setPage} total={120} pageSize={pageSize} aria-label="Invoice pages" />
  {/* No handler at all: the action is drawn and focusable, and pressing it does nothing. */}
  {/* expect: interaction/action-without-handler */}
  <TopNavigation type="liquid-overlay" title="Site visit" leading={{ icon: "icon-x-medium-line", label: "Close viewer" }} trailing={[{ icon: "icon-share-01-line", label: "Share", onClick: share }]} />
  {/* expect: interaction/action-without-handler */}
  <EmptyState title="No files yet" primaryAction={{ label: "Upload file", onClick: upload }} secondaryAction={{ label: "Import from Figma" }} />
  {/* expect: interaction/action-without-handler */}
  <div><Card theme="border"><Button appearance="flat" level="primary" size="sm">Duplicate</Button></Card></div>
  {/* expect: interaction/action-without-handler */}
  <Sidebar sections={sections} onItemClick={go} footer={<button type="button"><Icon name="icon-trash-line" /><span>Trash</span></button>} />
  {/* expect: interaction/action-without-handler */}
  <BottomSheet open={open} onOpenChange={setOpen} type="action" title="Create" items={createItems} />
  {/* expect: interaction/action-without-handler */}
  <Breadcrumbs items={[{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }]} />
  {/* Position, effect styles and per-corner radius (spec 2026-10-03 §3.6). */}
  {/* expect: layout/constraint-needs-absolute */}
  <Box constraintX="right" insetRight="sm">Saved</Box>
  {/* expect: layout/inset-not-read */}
  <Box position="absolute" insetRight="sm">Close</Box>
  {/* expect: layout/absolute-fill */}
  <Stack position="absolute" constraintY="bottom" width="fill">Caption</Stack>
  {/* expect: layout/stretch-ignores-size */}
  <Box position="absolute" constraintX="left-right" width={320}>Caption bar</Box>
  {/* expect: layout/absolute-align-self */}
  <Box position="absolute" alignSelf="end">Scrim</Box>
  <figure>
    {/* expect: layout/absolute-parent */}
    <Box position="absolute" constraintX="right">Zoom</Box>
  </figure>
  {/* expect: box/effect-needs-surface */}
  <Box surface="pale" effectStyle="Shadow/Bottom/Level-1" padding="md">Tinted well</Box>
  {/* expect: box/effect-needs-surface */}
  <Box effectStyle="Shadow/Top/Level-2" padding="md">No fill</Box>
  {/* expect: box/blur-needs-tint */}
  <Box surface="surface" effectStyle="Effect/Overlay" padding="md">Opaque panel</Box>
  {/* expect: box/shadow-no-border */}
  <Box surface="surface" border="pale" effectStyle="Shadow/Bottom/Level-1" padding="md">Panel</Box>
  {/* expect: radius/redundant-corners */}
  <Box radius="lg" radiusTopLeft="lg" radiusBottomRight="xs">Bubble</Box>
  {/* expect: radius/redundant-corners */}
  <Image src={photo} alt="Harbour at dusk" radiusTopLeft="sm" radiusTopRight="sm" radiusBottomRight="sm" radiusBottomLeft="sm" />
  {/* expect: radius/redundant-corners */}
  <Box radius="md" radiusTopLeft="xl" radiusTopRight="xl" radiusBottomRight="xs" radiusBottomLeft="xs">Range</Box>
  {/* expect: radius/full-mixed */}
  <Box surface="surface" radius="full" radiusBottomRight="xs">Pill tail</Box>
  {/* expect: radius/full-mixed */}
  <Image src={photo} alt="Harbour at dusk" radius="full" radiusTopLeft="lg" />
  {/* expect: content/lights-no-light-text */}
  <Text tone="warning-light">Due tomorrow</Text>
  {/* expect: content/lights-no-light-text */}
  <Heading level={3} tone={"support-yellow-light"}>Pending</Heading>
  {/* expect: api/overrides-studio-only */}
  <div><Card subAction={{ label: "More", onClick: act }} overrides={{ "Sub-Action": { level: "danger" } }}>Team</Card></div>
</>;

// A component's root card is judged where the component is used: three side by side take Small.
// expect: card/spacing-by-count
function StatCard({ label }: { label: string }) { return <Card theme="flat">{label}</Card>; }
export const Stats = () => <PlatformPhone label="Home"><Grid columns={3} gap="md"><StatCard label="Inside" /><StatCard label="Humidity" /><StatCard label="kWh today" /></Grid></PlatformPhone>;
