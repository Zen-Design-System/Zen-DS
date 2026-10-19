// Correct usage of every rule's subject: the harness must report nothing here.
export const Good = () => <>
  <Button level="primary" onClick={save}>Save</Button>
  <Button level="tertiary" onClick={cancel}>Cancel</Button>
  {/* zen-allow-secondary: pressed toolbar toggle */}
  <IconButton onClick={act} level="secondary" aria-label="Bold" aria-pressed icon={<Icon name="icon-bold-01-line" />} />
  {/* A flat Secondary IconButton is Figma's quiet ⋮ trigger: no justification needed. */}
  <IconButton appearance="flat" level="secondary" size="sm" aria-label="More actions" onClick={act} icon="icon-dots-vertical-line" />
  <ToggleListItem title="Daily digest" caption="One email at 8:00 am" checked={on} onCheckedChange={setOn} />
  <ChipGroup aria-label="Repeat" options={repeats} value={repeat} onValueChange={setRepeat} />
  <Button level="danger" onClick={remove}>Delete project</Button>
  <Chip variant="advanced" dropdown popoverItems={items}>Status</Chip>
  <InputField label="Name" readOnly />
  <InputField aria-label="Share link" readOnly value={link} />
  <InputField {...sharedFieldProps} />
  <Search placeholder="Search components" />
  <Checkbox label="Remember me" checked={on} onChange={setOn} />
  <RadioButton name="plan" label="Monthly" checked />
  <Badge remove onRemove={() => drop("design")}>Design</Badge>
  <Tag remove onRemove={remove}>react</Tag>
  <BadgeCounter value="99+" />
  <Avatar theme="photo" src={url} alt="Ava Chen" />
  <Avatar theme="blue" alt="">AC</Avatar>
  <Avatar theme="green" background="subtle" alt="Ava Chen">AC</Avatar>
  <Avatar theme="teal" background="solid" src={url} alt="Minh Tran" />
  <Avatar theme="indigo" background="solid" alt="Bao Le">BL</Avatar>
  <Tooltip content="Duplicate"><IconButton onClick={act} aria-label="Duplicate" icon={<Icon name="icon-copy-line" />} /></Tooltip>
  {/* A plain alias of an icon that only comes in cuts is a valid name (draws icon-search-medium-line). */}
  <IconButton onClick={act} aria-label="Search" icon="icon-search-line" />
  <Tabs aria-label="Settings" items={tabs} value={tab} onChange={setTab} />
  <Segmented aria-label="Layout" options={views} value={view} onChange={setView} />
  <Dialog open={open} onOpenChange={setOpen} theme="negative" title="Delete?" primaryAction={{ label: "Delete", level: "danger" }} />
  <Popover open={open} onOpenChange={setOpen} items={items} onSelect={pick} />
  <PageHeader title="Members" actions={<><Button level="tertiary" onClick={exportCsv}>Export</Button><Button level="primary" onClick={invite}>Invite member</Button></>} />
  <DashboardHeader search={<Search placeholder="Search leave requests" />} controls={<Chip variant="advanced" dropdown popoverItems={items}>Status</Chip>} subheading="12 leave requests" actions={<><Button level="tertiary" onClick={exportCsv}>Export</Button><Button level="primary" onClick={submitLeave}>Submit leave</Button></>} />
  <DashboardHeader search={<Search placeholder="Search expenses" />} subheading={plural(count, "expense")} />
  <DashboardHeader type="navigation" leading={<Breadcrumbs items={crumbs} onNavigate={go} />} trailing={<AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot onClick={openInbox} />} />
  <DashboardHeader type="main" title="My leaves" subheading="12 days left this year." actions={<Button level="primary" onClick={submitLeave}>Submit leave</Button>} />
  <Popover open items={items} onSelect={pick} />
  <Link href="/settings/billing">Billing settings</Link>
  <Link as={RouterLink} to="/projects/atlas">Project Atlas</Link>
  <Link href="https://status.zen.design" external>Status page</Link>
  <Link href="/pricing" aria-label="Learn more about pricing">Learn more</Link>
  <Link href="/legal/terms" tone="inherit">Terms of service</Link>
  <Link href="/status" underline="none">Status</Link>
  <Menu trigger={<IconButton onClick={act} aria-label="Actions for INV-1042" icon={<Icon name="icon-dots-horizontal-line" />} />} items={[{ id: "duplicate", label: "Duplicate" }, { type: "separator" }, { id: "delete", label: "Delete invoice", danger: true }]} onSelect={run} />
  <Menu trigger={<Button level="tertiary" size="sm">Edit</Button>}><MenuItem label="Rename" onSelect={rename} /></Menu>
  <FormActions><Button level="tertiary" onClick={cancel}>Cancel</Button><Button level="primary" type="submit">Save changes</Button></FormActions>
  <Form form={form}><Checkbox label="Send me the weekly digest" checked={digest} onChange={setDigest} /></Form>
  <FormFieldset legend="Email me about" kind="checkbox"><Checkbox label="Releases" checked={on} onChange={setOn} /></FormFieldset>
  <FormFieldset legend="Delivery" kind="radio"><RadioButton name="delivery" label="Standard" checked /></FormFieldset>
  <Box border="pale" padding="md">Static notes</Box>
  <Box border="subtle" padding="md" onClick={open}>Clickable tile</Box>
  <ProgressBar value={40} label />
  <ProgressCircle value={40} aria-label="Upload" />
  <Toast type="positive" title="Changes saved" action={{ label: "Undo", onClick: undo }} />
  <AlertBanner size="medium" theme="warning" action={{ label: "Upgrade", onClick: upgrade }}>Your trial ends in 3 days.</AlertBanner>
  <AlertBanner size="small">Scheduled maintenance tonight.</AlertBanner>
  <Button level="primary" onClick={save}>Save changes</Button>
  <Button appearance="flat" level="primary" size="sm" onClick={edit}>Edit</Button>
  <Button appearance="flat" level="primary" size="sm" onClick={duplicate}>Duplicate</Button>
  <Toggle label="Email notifications" selected={on} onSelectedChange={setOn} />
  <Tooltip content="Bold · ⌘B"><IconButton onClick={act} aria-label="Bold" icon={<Icon name="icon-bold-01-line" />} /></Tooltip>
  <Tabs aria-label="Order" items={[{ id: "overview", label: "Overview" }, { id: "refunds", label: "Refunds" }]} />
  <Tabs aria-label="Mail" items={[{ id: "inbox", label: "Inbox" }, …]} />
  <Segmented aria-label="View" options={[{ id: "grid", label: "Grid" }, { id: "list", label: "List" }]} />
  <Chip variant="advanced" selectionMode="multiple" selectionCount={owners.length} popoverItems={items} popoverMultiple>Owner</Chip>
  {/* Keeps its own choice (no onPopoverSelect): it counts the picked items itself. */}
  <Chip variant="advanced" selectionMode="multiple" popoverMultiple popoverLabel="Status" popoverItems={[{ id: "open", label: "Open", selected: true }, { id: "done", label: "Done" }]}>Status</Chip>
  <Dialog open={open} onOpenChange={setOpen} title="Settings"><InputField label="Workspace name" /></Dialog>
  <SidePanel open={open} onOpenChange={setOpen} title="Edit project" primaryAction={{ label: "Save changes" }}><Card theme="on-container">Brief</Card></SidePanel>
  <Dialog open={open} onOpenChange={setOpen} title="Project"><Card theme="on-container"><ListBox theme="border"><List aria-label="Files"><ListItem title="Brief.pdf" /></List></ListBox></Card></Dialog>
  <BottomSheet open={open} onOpenChange={setOpen} title="Members"><ListBox theme="on-container"><List aria-label="Members"><ListItem title="Ava Chen" /></List></ListBox></BottomSheet>
  <ListBox><List aria-label="Recent"><ListItem title="Brief.pdf" /></List></ListBox>
  <ListBox footer={<Button level="tertiary" onClick={openCalendar}>Open calendar</Button>}><List aria-label="Out this week"><ListItem title="Sarah Kim" /></List></ListBox>
  <ListBox footer={<Button onClick={openInbox}>Go to Inbox</Button>}><List aria-label="Messages"><ListItem title="Sarah Kim" /></List></ListBox>
  <ListBox footer={<Stack direction="row" gap="xs" align="center"><Button onClick={openInbox}>Go to Inbox</Button><Button onClick={archiveAll}>Archive all</Button></Stack>}><List aria-label="Messages"><ListItem title="Sarah Kim" /></List></ListBox>
  <ListBox footer={<Text textStyle="Body/Small/Regular" tone="light">Updated 2 minutes ago</Text>}><List aria-label="Activity"><ListItem title="Brief shared" /></List></ListBox>
  <Accordion title="Billing">Invoices are emailed monthly.</Accordion>
  <Pagination page={1} onPageChange={setPage} pageCount={10} />
  <ProgressBar value={100} label />
  <Toast title="Export ready" action={{ label: "View", onClick: open }} />
  <InputField label="Email" placeholder="name@company.com" />
  <Sidebar sections={sections} subMenu={<SidebarSubMenu items={subItems} />} subMenuLabel="Projects" onSubMenuClose={close} />
  <Divider />
  <Box width={160} height={120}>
    <Shape type="ellipse" position="absolute" insetLeft={24} insetTop={8} width={96} height={96} arcRatio={60} fill="accent-solid" />
    <Shape type="line" position="absolute" insetLeft={8} insetTop={110} width={140} rotation={10} stroke="neutral-subtle" />
  </Box>
  <InlineMessage theme="info" title="Invites expire after 7 days">Resend the invite from Members.</InlineMessage>
  <InlineMessage theme="custom" icon={<Avatar size="small" alt="">AC</Avatar>} title="Ava shared a file" />
  <EmptyState title="No projects yet" primaryAction={{ label: "Create project", onClick: create }}>Projects you create show up here.</EmptyState>
  <Stepper aria-label="Checkout" steps={[{ id: "cart", title: "Cart" }, { id: "pay", title: "Payment" }, { id: "review", title: "Review" }]} current={1} />
  <Slider aria-label="Volume" value={v} onChange={setV} icon="icon-volume-max-solid" />
  <Slider aria-labelledby="brightness-label" theme="white" size="large" />
  <RichTextField label="Announcement" onValueChange={(html) => setHtml(html)} />
  {/* Catalogue cards sit in their own <div>: side by side they would read as one group (card/spacing-by-count). */}
  <PlatformPhone label="Home"><Grid columns={3} gap="md"><Card spacing="small">Inside</Card><Card spacing="small">Humidity</Card><Card spacing="sm">kWh today</Card></Grid></PlatformPhone>
  <PlatformPhone label="Home"><Grid columns={3} gap="md">{["Inside", "Humidity", "kWh today"].map((label) => <Card key={label} spacing="small">{label}</Card>)}</Grid></PlatformPhone>
  <PlatformPhone label="Home"><Grid columns={3} gap="md">{rooms.map((room) => <Card key={room} spacing="small">{room}</Card>)}</Grid></PlatformPhone>
  <PlatformPhone label="Home"><Stack gap="md"><Card>Devices</Card></Stack></PlatformPhone>
  {/* Desktop cards keep Medium whatever their number: the rule is for phones only. */}
  <Grid columns={3} gap="md"><Card>Revenue</Card><Card>Expenses</Card><Card>Profit</Card></Grid>
  <Grid columns={4} gap="md"><MetricCard label="Revenue" value="$12.4K" /><MetricCard label="Orders" value="320" /><MetricCard label="Refunds" value="4" /><MetricCard label="Visitors" value="9.1K" /></Grid>
  <PlatformPhone label="Energy"><Grid columns={3} gap="sm"><MetricCard spacing="small" label="Today" value="12 kWh" /><MetricCard spacing="small" label="Week" value="80 kWh" /><MetricCard spacing="small" label="Month" value="320 kWh" /></Grid></PlatformPhone>
  <PlatformPhone label="Stats"><Grid columns={2} gap="sm"><MetricCard type="tile" label="Success rate" value="56%" /><MetricCard type="tile" label="Sessions" value="1.2K" /></Grid></PlatformPhone>
  <PlatformPhone label="Voice"><Stack gap="md"><Card theme="flat" spacing="small"><VoiceRecorder state="ready" onRecord={record} onPause={pause} onResume={resume} onFinish={finish} onDiscard={discard} /></Card></Stack></PlatformPhone>
  <div><Card onClick={open} aria-label="Zen website"><Text>Zen website</Text></Card></div>
  <div><Card theme="pale" color="violet"><Text>Design hours</Text></Card></div>
  <AppShell sidebar={null}><Card theme="subtle" color="cyan"><Text>Invoiced</Text></Card></AppShell>
  <AppShell sidebar={null} canvas="alt"><Card theme="pale" color="cyan"><Text>Invoiced</Text></Card></AppShell>
  <PlatformPhone label="Budget" canvas="alt"><MetricCard theme="pale" color="green" label="Saved" value="$1,240" /></PlatformPhone>
  <div><Card theme="solid" color="neutral"><Text>Invoiced this year</Text></Card></div>
  <div><Card theme="border" surface="flat"><Text>Hours this week</Text></Card></div>
  <div><Card theme="shadow" surface="alt"><Text>Outstanding</Text></Card></div>
  <MetricCard theme="solid" color="yellow" label="Next payout" value="$12,400" />
  <MetricCard theme="solid" color="accent" type="tile" label="Success rate" value="56%" trend={{ direction: "positive", label: "+24%" }} />
  <ChartCard title="Revenue" theme="pale" color="cyan"><LineChart aria-label="Revenue per month" data={[{ label: "Sep", value: 1 }]} /></ChartCard>
  <div><Card theme="border" subAction={{ label: "More actions", onClick: openMenu }}><Text>Q4 review</Text></Card></div>
  <ListItem title="Ava Chen" onClick={open} trailing={<Text>9:41</Text>} />
  <ListItem title="Ava Chen" trailing={<IconButton onClick={act} size="md" aria-label="Message" icon={<Icon name="icon-mail-01-line" />} />} />
  <ListItem title="Ava Chen" onClick={open} trailing={<IconButton onClick={act} appearance="flat" size="md" aria-label="Message" icon={<Icon name="icon-mail-01-line" />} />} />
  <DockIcon theme="emoji" emoji="🎉" />
  <VoiceRecorder state="recording" onRecord={record} onPause={pause} onResume={resume} onFinish={finish} onDiscard={discard} />
  <AiVoiceConversation state="listening" onStart={listen} onDone={answer} onInterrupt={listen} onEnd={end} />
  <Table aria-label="Files" rows={rows} getRowId={getId} columns={columns} selectable selectedIds={ids} onSelectionChange={setIds} />
  <Table caption="Invoices" rows={rows} getRowId={getId} columns={[{ id: "n", header: "Name", sortable: true, cell: render }]} onSortChange={setSort} />
  <Table aria-label="Stock" rows={rows} getRowId={getId} columns={[{ id: "name", header: "Name", cell: render, edit: { value: getName, onCommit: save } }, { id: "qty", header: "Qty", align: "right", cell: render, edit: { type: "number", value: getQty, onCommit: save, validate: check } }]} />
  <IconButton onClick={act} level="tertiary" aria-label="More actions" aria-haspopup="menu" icon={<Icon name="icon-dots-horizontal-line" />} />
  <Rating aria-label="Rate this template" value={stars} onChange={setStars} />
  <ColorSelector aria-label="Label colour" colors={colors} value={color} onChange={setColor} />
  <Metric label="Revenue" value="$1,680.68" />
  <MetricCard type="sparkline" label="Revenue" value="$105,700" series={[61, 66, 64, 73]} />
  <MetricCard type="goal-progress" label="Collected" value="$108,400" goal={{ value: 108400, target: 135000 }} />
  <MetricCard type="comparison" label="Cash flow" comparison={[{ id: "in", label: "Invoiced", value: "$105,700" }, { id: "out", label: "Collected", value: "$88,300" }]} />
  <MetricCard type="category-bar" label="Invoices" value="$184,200" categories={[{ id: "paid", label: "Paid", value: 106800 }, { id: "pending", label: "Pending", value: 77400 }]} />
  <FileUpload label="Contract" accept="application/pdf" caption="PDF only. Max 2 MB" onFilesAdd={add} />
  <SidePanel open={open} onOpenChange={setOpen} title="Edit project" primaryAction={{ label: "Save changes" }} />
  <IconButton onClick={act} appearance="flat" level="primary" size="sm" aria-label="Close" icon={<Icon name="icon-x-small-line" />} />
  <TableMedia media={<Flag name="Vietnam" />}>Vietnam</TableMedia>
  <ListItem title="United Kingdom" caption="+44" leading={<Flag name="United Kingdom" size="lg" />} onClick={pick} />
  <ListItem title="brand.pdf" leading={<FileIcon format={fileIconFormatOf("brand.pdf")} size={36} />} trailing={<IconButton onClick={act} appearance="flat" level="primary" size="md" aria-label="Download brand.pdf" icon={<Icon name="icon-download-01-line" />} />} />
  <div style={{ display: "flex", flexDirection: "column" }}><Button level="primary" size="md" onClick={create}>Create project</Button></div>
  <div style={{ display: "flex", flexDirection: "column" }}><Button level="tertiary" size="sm" style={{ alignSelf: "flex-start" }} onClick={simulate}>Simulate an upload</Button></div>
  <div className="pe-stack"><Button level="primary" size="sm" style={{ justifySelf: "start" }} onClick={reserve}>Reserve</Button></div>
  <div style={{ display: "flex", gap: 8 }}><Button level="tertiary" size="sm" onClick={cancel}>Cancel</Button></div>
  {/* A table that is its own section: an h2 Heading/4 above it, and the Table points to it. */}
  {/* A table inside a widget Card: the widget title is Heading/Subheading. */}
  <div><Card>
    <Heading level={2} textStyle="Heading/Subheading" id="claims-title">Recent claims</Heading>
    <Table aria-labelledby="claims-title" columns={[]} rows={[]} getRowId={(r) => r.id} />
  </Card></div>
  <Heading level={2} textStyle="Heading/4" id="invoices-title">Invoices</Heading>
  <Table aria-labelledby="invoices-title" columns={[]} rows={[]} getRowId={(r) => r.id} />
  {/* The Heading default for level 2 is Heading/4 (decision 7); a description paragraph above a table is not a title. */}
  <Heading level={2} id="payments-title">Payments</Heading>
  <Text tone="base">Payments from the last 30 days.</Text>
  <Table aria-labelledby="payments-title" columns={[]} rows={[]} getRowId={(r) => r.id} />
  <TopNavigation title="Files" trailing={[{ icon: "icon-plus-line", label: "Add", onClick: add }, { icon: "icon-dots-horizontal-line", label: "More", onClick: openMore }]} />
  {/* Figma's Trailing-Slot takes three: three trailing actions, and three beside the large title. */}
  <TopNavigation title="Files" trailing={[{ icon: "icon-plus-line", label: "Add", onClick: add }, { icon: "icon-share-01-line", label: "Share", onClick: share }, { icon: "icon-dots-horizontal-line", label: "More", onClick: openMore }]} />
  <TopNavigation title="Ava Chen" trailing={[{ icon: "icon-phone-line", label: "Audio call", group: "call", onClick: callAudio }, { icon: "icon-video-recorder-line", label: "Video call", group: "call", onClick: callVideo }, { icon: "icon-star-01-line", label: "Favourite", onClick: favourite }, { icon: "icon-dots-horizontal-line", label: "More", onClick: openMore }]} />
  {/* A shell that also runs on phones: the page title in sections and the bar, the same words (component-usage-rules §17). */}
  <AppShell sidebar={nav} sections={<PageHeader title="Invoices" />} topNavigation={<TopNavigation title="Invoices" largeTitle="Invoices" />} bottomNavigation={<BottomNavigation value="invoices" onValueChange={go} items={roots} />}><Container>{page}</Container></AppShell>
  <TopNavigation title="Files" largeTitle="Files" largeTitleAction={[{ icon: "icon-plus-line", label: "Add", onClick: add }, { icon: "icon-share-01-line", label: "Share", onClick: share }, { icon: "icon-dots-horizontal-line", label: "More", onClick: openMore }]} />
  <BottomNavigation value="a" onValueChange={go} items={[{ id: "a", label: "Home", icon: "icon-home-smile-line" }, { id: "b", label: "Search", icon: "icon-search-medium-line" }, { id: "c", label: "Me", icon: "icon-user-line" }]} />
  <BottomSheet open={open} onOpenChange={setOpen} type="action" title="Share" items={shareItems} onSelect={share} />
  <ChatMessage side="others" author={{ name: "Ava Chen" }} {...demo.act("m1", "others")}>Hi there</ChatMessage>
  <AiChatBubble side="ai" streaming={busy} actions={busy ? [] : answerActions}>Working</AiChatBubble>
  <StackBarChart aria-label="Budget" data={data} series={series} />
  <BarChart aria-label="Revenue per month, Jan – Dec 2026" data={data} />
  <DonutChart aria-label="Revenue by client, Q3 2026" data={slices} />
  <RadialChart aria-label="Budget used by project" data={slices} legendPosition="end" />
  <DonutChart aria-label="Revenue by client, Q3 2026" data={slices} size="large" />
  <LineChart aria-label="Weekly visits" data={data} showLegend={false} />
  <HeatmapChart aria-label="Hours logged by weekday and hour" rows={rows} columns={columns} values={values} />
  <BarList aria-label="Revenue by client, 2026 so far" headers={{ label: "Client", value: "Revenue" }} data={[{ label: "Lumen Bank", value: 96400 }, { label: "Phin & Co", value: 71200 }, { label: "Mekong Freight", value: 54800 }, { label: "Other clients", value: 60100 }]} />
  <BulletChart aria-label="Quarter goals, Q3 2026" data={[{ label: "Revenue", value: 798, target: 900 }, { label: "New clients", value: 18, target: 24 }, { label: "Utilisation", value: 82, target: 85 }]} />
  <GaugeChart aria-label="Billable share of logged hours, September 2026" value={82} target={85} actualLabel="Billable" />
  <GaugeChart aria-label="Billable hours of logged hours, September 2026" value={1052} max={1284} target={1091} />
  <FunnelChart aria-label="Leads to signed projects, Q3 2026" data={[{ label: "Leads", value: 480 }, { label: "Qualified", value: 312 }, { label: "Proposal", value: 168 }, { label: "Signed", value: 62 }]} />
  <AreaChart aria-label="Billable hours per month, Apr – Sep 2026" data={data} series={[{ id: "hours", label: "Billable hours" }]} />
  <AreaChart type="stacked" aria-label="Billable hours per month by team, Apr – Sep 2026" data={data} series={[{ id: "design", label: "Design" }, { id: "engineering", label: "Engineering" }, { id: "delivery", label: "Delivery" }]} />
  <GroupedBarChart aria-label="Invoiced and collected per month, Apr – Sep 2026" data={data} series={[{ id: "invoiced", label: "Invoiced" }, { id: "collected", label: "Collected" }]} />
  <ComboChart aria-label="Revenue and margin per month, Apr – Sep 2026" data={combo} barLabel="Revenue" lineLabel="Margin" lineMax={100} />
  <TableMedia media={<Avatar size="small" theme="photo" src={photo} alt="" />} caption="Designer">Ava Chen</TableMedia>
  <TableMedia media={<Avatar size="xsmall" theme="photo" src={photo} alt="" />}>Ava Chen</TableMedia>
  <TableMedia media={<DockIcon icon="icon-file-doc-line" size="xsmall" />}>Spec.pdf</TableMedia>
  <TableMedia media={<DockIcon icon="icon-file-doc-line" size="small" />} caption="2.4 MB">Spec.pdf</TableMedia>
  <FileUpload label="Avatar" caption="PNG or JPG. Max 2 MB" accept="image/*" files={files} onReplace={(file) => replace(file)} />
  <BadgeCounter size="small" theme="neutral" background="subtle" value={12} />
  {/* A count beside its label is a BadgeCounter; a count inside a sentence stays text (badge/count-text-uses-counter). */}
  <BadgeCounter className="panel__count" size="xs" theme="neutral" background="subtle" value={items.length} />
  <span className="panel__caption">{items.length} files</span>
  <Badge size="small" theme="green" background="subtle">Live</Badge>
  <Chip variant="advanced" size="small" leading={<Icon name="icon-filter-lines-line" decorative />} aria-haspopup="dialog" onClick={openFilters}>All filters</Chip>
  <ProgressBar value={92} theme="status" scale="quota" label="Storage · 92% used" />
  <ProgressBar value={40} theme="status" label="40% set up" />
  <Segmented level="secondary" aria-label="View" value={view} onChange={setView} options={[{ id: "grid", label: null, "aria-label": "Grid view", leading: <Icon name="icon-grid-01-line" decorative /> }, { id: "list", label: null, "aria-label": "List view", leading: <Icon name="icon-list-line" decorative /> }]} />
  <SliderField label="Overlay Opacity" defaultValue={0.6} min={0} max={1} step={0.01} />
  <SliderField label="Offset X" defaultValue={239} min={0} max={400} />
  <CurvePreview type="spring" bounce={0.3} />
  <CurvePreview type="ease-in-out" />
  <ColorField label="Brand colour" defaultValue="#1F6FEB" savedColors={["#1F6FEB", "#FFFFFF"]} />
  <ColorPicker aria-label="Shadow tint" defaultValue="#16e" />
  <InputField layout="inline" label="Title" defaultValue="Japan" />
  <ColorSelector aria-label="Label colour" colors={[{ value: "var(--zen-color-background-support-blue-solid)", label: "Blue" }, { value: "var(--zen-color-background-support-green-solid)", label: "Green" }]} />
  <Icon name="icon-check-line" size="sm" decorative />
  <Icon name="icon-check-line" size={14} decorative />
  <Text tone="light">{plural(results.length, "place")}</Text>
  <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" dot onClick={openInbox} />
  <Menu align="end" trigger={<AppShellAccount name="Ava Chen" />} items={[{ id: "out", label: "Sign out" }]} onSelect={signOut} />
  <Text tone="light">{sessions.length} phiên đang mở</Text>
  <Text tone="light">{picked.length} selected · {future.length} to redo</Text>
  <Chip variant="advanced" size="small" selectionMode="multiple" selectionCount={statuses.length} select={statuses.length > 0}>Status</Chip>
  <TopNavigation type="compact" title="Files" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />
  <IconButton onClick={act} appearance="flat" level="primary" size="md" aria-label="Back" icon={<Icon name="icon-chevron-left-line-medium" />} />
  <Button level="tertiary" startIcon={<Icon name="icon-arrow-left-line" decorative />} onClick={moveLeft}>Move to the left column</Button>
  <AiChatBubble side="ai" thinking />
  <TopNavigation type="compact" title="Files" controlBar={<Segmented fullWidth options={tabs} value={tab} onChange={setTab} aria-label="Filter files" />} />
  <PopoverBulkAction aria-label="Selection actions"><PopoverBulkActionGroup aria-label="Edit"><IconButton onClick={act} appearance="flat" size="md" aria-label="Copy" icon={copy} /></PopoverBulkActionGroup></PopoverBulkAction>
  <TopNavigation title="Inbox" largeTitle="Inbox" collapsed={collapsed} controlBar={<Search placeholder="Search messages" />} searchAction={{ label: "Search messages", onClick: openSearch }} trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: compose }]} />
  <TopNavigation title="Files" collapsed={collapsed} controlBar={<Segmented fullWidth options={tabs} value={tab} onChange={setTab} aria-label="Filter files" />} />
  <ChatMessage side="you" holdActions={[{ id: "copy", label: "Copy", icon: "icon-copy-solid" }, { id: "delete", label: "Delete", icon: "icon-trash-solid", destructive: true }]}>Hi</ChatMessage>
  <IconButton onClick={act} appearance="flat" level="primary" size="md" aria-label="Archive" icon={<Icon name="icon-archive-line" />} />
  <IconButton onClick={act} appearance="flat" level="primary" size="md" aria-label="Archive" tooltip="Archive (E)" icon={<Icon name="icon-archive-line" />} />
  <Tooltip content="Archive (E)"><Box><Button onClick={act}>Archive</Button></Box></Tooltip>
  <button type="button" className="pe-result" onClick={open}><Icon name="icon-clock-line" size="sm" decorative /><Text>{item}</Text></button>
  <ChatComposer onSend={send} replyTo={replying} onCancelReply={cancelReply} />
  <ChatCall state="in-missed" detail="12:33" onAction={callBack} />
  <ChatMessage side="you" onReact={react} reactions={[{ kind: "heart", by: [ava, bao, chi] }]}>Nice work</ChatMessage>
  {/* zen-allow-compact-button: App Store-style Get pill beside the app row */}
  <Button level="tertiary" size="xs" onClick={install}>Get</Button>
  <Image src={photo} alt="White houses and a windmill by the sea" ratio="4:3" caption="Oia, Santorini" />
  <Thumbnail src={photo} alt="" size="sm" />
  <ActionBar primaryAction={{ label: "Add to cart", onClick: add }} secondaryAction={{ label: "Save for later", onClick: save }} />
  <PlatformPhone label="Settings"><Toggle label="Sync over Wi-Fi only" size="lg" checked={wifi} onCheckedChange={setWifi} /><InputField label="Name" value={name} onValueChange={setName} /></PlatformPhone>
  <PlatformPhone label="Focus"><Toggle label="Do not disturb" size="xl" icon="icon-moon-01-line" checked={wifi} onCheckedChange={setWifi} /></PlatformPhone>
  <BottomSheet open={open} onOpenChange={setOpen} title="Filters"><ToggleButton aria-label="In stock only" size="large" checked={inStock} onCheckedChange={setInStock} /><SelectField label="Sort" size="md" options={sorts} /></BottomSheet>
  <ActionBar><Button level="primary" size="lg" onClick={add}>Add to cart</Button><Button level="tertiary" size="lg" onClick={save}>Save for later</Button></ActionBar>
  <ActionBar direction="horizontal" summary={<Text textStyle="Body/Small/Regular" tone="base" role="status">3 unsaved changes</Text>}><Button level="tertiary" onClick={undo}>Undo changes</Button><Button level="primary" type="submit">Save changes</Button></ActionBar>
  <VisuallyHidden as="a" href="#main" focusable>Skip to main content</VisuallyHidden>
  <VisuallyHidden>Actions</VisuallyHidden>
  <Heading level={1}>Billing</Heading>
  <Heading level={2} textStyle="Heading/4">Current plan</Heading>
  {/* The compact app bar title is the screen's h1 in its bar style; a list group header (kicker) may use Base. */}
  <Text as="h1" textStyle="Body/Extra/Bold" className="zen-top-nav__title">Order #1042</Text>
  <Heading level={2} textStyle="Body/Small/Bold" tone="light">Pinned</Heading>
  <DescriptionList items={[{ term: "Subtotal", description: "$311.90" }, { term: "Total", description: "$321.90", emphasis: true }]} />
  <EmptyState title="No members match" size="sm" secondaryAction={{ label: "Clear filters", onClick: reset }} />
  <div><Card theme="border"><EmptyState size="sm" title="No invoices yet" headingLevel={4} primaryAction={{ label: "Create invoice", onClick: create }} /></Card></div>
  <ChartCard title="Revenue"><EmptyState title="No revenue yet" primaryAction={{ label: "Connect billing", onClick: create }} /></ChartCard>
  <TableActions><IconButton onClick={act} appearance="flat" level="primary" aria-label="Actions for Ava" icon={<Icon name="icon-dots-horizontal-line" />} /></TableActions>
  <Menu trigger={<IconButton appearance="flat" level="primary" aria-label="Actions for Ava" icon="icon-dots-horizontal-line" />} align="end" items={[{ id: "edit", label: "Edit", onSelect: act }]} />
  <NumberField label="Width" value={width} onValueChange={setWidth} />
  <Toast type="warning" title="Storage almost full" action={{ label: "Upgrade", onClick: upgrade }} onClose={dismiss}>You have used 92% of your space.</Toast>
  <DatePicker value={date} onValueChange={setDate} month={month} onMonthChange={setMonth} />
  {/* With actions, onApply commits the draft: it is the handler of value and range. */}
  <DatePicker value={date} showActions onApply={(picked) => setDate(picked)} />
  <DatePicker calendar="dual" selectionMode="range" range={period} showActions onApply={(_, picked) => picked && setPeriod(picked)} />
  <Pagination theme="inline" page={page} onPageChange={setPage} total={120} pageSize={pageSize} onPageSizeChange={setPageSize} aria-label="Invoice pages" />
  {/* A pin (expanded only while pinned, uncontrolled otherwise) and a disabled preview are not frozen controls. */}
  <Accordion title="Shipping" expanded={pinned ? true : undefined}>Ships in 2 days.</Accordion>
  <Checkbox label="Remember me" checked={remember} disabled />
  {/* Figma State=Disabled: Text, Select, Date, Number, Text-Area and Search (a Field-Only instance). */}
  <InputField label="Custom domain" helpText="Turn on Custom domain to edit it." disabled />
  <Search aria-label="Search members" disabled />
  {/* Every action does something: its own onClick or href, a submit, a Menu trigger, or a documented default (Dialog,
      ModalForm, SidePanel and BottomSheet actions without onClick close the overlay). */}
  <TopNavigation type="liquid-overlay" title="Site visit" leading={{ icon: "icon-x-medium-line", label: "Close viewer", onClick: close }} trailing={[{ icon: "icon-share-01-line", label: "Share", onClick: share }]} />
  <Dialog open={open} onOpenChange={setOpen} title="Discard draft?" primaryAction={{ label: "Discard", level: "danger", onClick: discard }} secondaryAction={{ label: "Keep editing" }} />
  <Menu trigger={<Button level="tertiary" size="sm">Actions</Button>} items={[{ id: "rename", label: "Rename" }, { id: "archive", label: "Archive" }]} onSelect={run} />
  <Breadcrumbs items={[{ id: "files", label: "Files", href: "/files" }, { id: "brand", label: "Brand refresh" }]} />
  <Sidebar sections={[{ items: [{ id: "home", label: "Home", icon: "icon-home-03-line" }] }]} onItemClick={go} footer={<button type="button" onClick={openHelp}>Help</button>} />
  <AppShell sidebar={nav} header={<Breadcrumbs master={false} items={crumbs} onNavigate={go} />}
    headerActions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={openInbox} /><Menu align="end" trigger={<AppShellAccount name="Ava Chen" />} items={accountItems} onSelect={runAccountAction} /></>}>
    <Container><PageHeader title="Invoices" actions={<Button level="primary" onClick={createInvoice}>New invoice</Button>} /></Container>
  </AppShell>
  <Form onSubmit={save}><Button level="primary" type="submit">Save profile</Button></Form>
  <Button level="primary" disabled>Publish</Button>
  {`<Button level="primary">Save</Button>`}
  {/* Position, effect styles and per-corner radius: absolute layers pinned inside a Box, Card or Grid frame. */}
  <Box surface="surface" radius="lg" clip>
    <Box position="absolute" constraintX="left-right" constraintY="top-bottom">Background media</Box>
    <Box position="absolute" constraintX="right" constraintY="top" insetRight="sm" insetTop="sm">Close</Box>
    <Stack position="absolute" constraintX="left-right" constraintY="bottom" insetLeft="sm" insetRight="sm" insetBottom="sm" height={48}>Caption</Stack>
    <Box padding="md">Content after the media</Box>
  </Box>
  <div><Card theme="border"><Box position="absolute" constraintX="center" constraintY="center" width={200}>Centred</Box></Card></div>
  <Grid columns={2}><Box position={layerPosition} constraintX="right" insetRight="sm">Toggled by state</Box></Grid>
  <Box surface="surface" effectStyle="Shadow/Bottom/Level-1" padding="lg">Elevated panel</Box>
  <Box surface="pale" effectStyle="Effect/Overlay" padding="md">Frosted bar</Box>
  <Box surface="surface" radius="xl" radiusBottomRight="xs">Chat tail</Box>
  <Image src={photo} alt="Harbour at dusk" radiusBottomLeft="none" radiusBottomRight="none" />
  <Box radiusTopLeft="3xl" radiusTopRight="3xl">Sheet top</Box>
  <Box surface="surface" radius="full" padding="xs">Pill</Box>
  <Image src={photo} alt="Harbour at dusk" radius="full" />
  <Box surface="surface" radius="full" radiusBottomLeft="none">Pill with a square corner</Box>
  <Box surface="surface" radius="lg" radiusTopLeft="xs" radiusBottomRight="xs">Finite radius with corners</Box>
  <Stack surface="surface" radius="lg" effectStyle="Shadow/Bottom/Level-1" padding="lg" gap="md">One auto layout frame with a fill</Stack>
  <Stack border="pale" radius="md" padding="md" direction="row">Static bordered row</Stack>
  <Grid columns={2} surface="pale" effectStyle="Effect/Overlay" radius="xl" radiusBottomRight="xs" padding="md">Frosted grid</Grid>
  <Stack border="subtle" borderStyle="dashed" radius="lg" padding="lg" role="button" onClick={open}>Drop files here</Stack>
  <Stack border="pale" borderSides="bottom" borderWeight={2} paddingY="sm">Bar with a bottom rule</Stack>
  <Stack opacity={40} rotation={15} flip="horizontal">Faded, turned and mirrored</Stack>
  <Shape type="ellipse" opacity={60} width={24} height={24} />
  <Text tone="support-blue-strongest">Your files sync across every device you sign in on.</Text>
  <Text textStyle="Body/Small/Bold" tone="positive-light">Saved</Text>
  <Text textStyle="Body/Small/Regular" tone="negative-light">Enter an email address like name@company.com.</Text>
  <Icon name="icon-check-circle-line" tone="accent-light" />
  {/* A card's ⋮ is set through its own props; `overrides` is Zen Studio's (fixtures/studio-page.zen.tsx). */}
  <div><Card subAction={{ label: "More", icon: "icon-dots-horizontal-line", onClick: act }}>Team</Card></div>
</>;

// A component's root card is judged where the component is used: three side by side take Small, one keeps Medium.
function DeviceCard({ label }: { label: string }) { return <Card theme="flat" spacing="small">{label}</Card>; }
export const Devices = () => <PlatformPhone label="Devices"><Grid columns={3} gap="md"><DeviceCard label="HomePod mini" /><DeviceCard label="Ceiling light" /><DeviceCard label="Blinds" /></Grid></PlatformPhone>;
function RoomsCard() { return <Card theme="flat">Rooms</Card>; }
export const Home = () => <PlatformPhone label="Home"><Stack gap="md"><RoomsCard /></Stack></PlatformPhone>;
