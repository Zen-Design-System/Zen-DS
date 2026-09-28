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
  <InputField label="Name" disabled />
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
  <Chip variant="advanced" selectionMode="multiple" popoverItems={items} popoverMultiple>Owner</Chip>
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
  <EmptyState title="No members match" illustration={false} primaryAction={{ label: "Clear filters", onClick: reset }} />
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
  <Card onClick={open}><Button level="tertiary" onClick={edit}>Edit</Button></Card>
  {/* expect: list-item/clickable-row-toggle */}
  <ListItem title="Wi-Fi" onClick={open} trailing={<ToggleButton aria-label="Wi-Fi" selected={on} onSelectedChange={setOn} />} />
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
  {/* expect: uploader/needs-label */}
  <FileUpload caption="PDF only" onFilesAdd={add} />
  {/* expect: uploader/accept-caption */}
  <FileUpload label="Contract" accept="application/pdf" onFilesAdd={add} />
  {/* expect: side-panel/not-for-confirmations */}
  <SidePanel open={open} onOpenChange={setOpen} title="Delete project" primaryAction={{ label: "Delete project" }} />
  {/* expect: button/flat-level */}
  <IconButton onClick={act} appearance="flat" level="tertiary" size="sm" aria-label="Close" icon={<Icon name="icon-x-small-line" />} />
  {/* expect: file-icon/not-an-action */}
  <IconButton onClick={act} appearance="flat" level="primary" aria-label="Download" icon={<FileIcon format="pdf" />} />
  {/* expect: button/small-full-width  expect: button/compact-size-special */}
  <div style={{ display: "flex", flexDirection: "column" }}><Button level="tertiary" size="xs" onClick={simulate}>Simulate an upload</Button></div>
  {/* expect: button/small-full-width */}
  <Button level="primary" size="sm" style={{ width: "100%" }} onClick={save}>Save changes</Button>
  {/* expect: button/small-full-width */}
  <div className="pe-stack"><Button level="primary" size="sm" style={{ alignSelf: "flex-start" }} onClick={reserve}>Reserve</Button></div>
  {/* expect: table/title-heading-4 */}
  <Text style="Body/Base/Bold">Invoices</Text>
  <Table aria-label="Invoices" columns={[]} rows={[]} getRowId={(r) => r.id} />
  {/* expect: top-navigation/max-two-trailing */}
  <TopNavigation title="Files" trailing={[{ icon: "icon-plus-line", label: "Add", onClick: add }, { icon: "icon-share-01-line", label: "Share", onClick: share }, { icon: "icon-trash-line", label: "Delete", onClick: remove }]} />
  {/* expect: bottom-navigation/destinations */}
  <BottomNavigation value="a" onValueChange={go} items={[{ id: "a", label: "Home", icon: "icon-home-smile-line" }, { id: "b", label: "Me", icon: "icon-user-line" }]} />
  {/* expect: bottom-sheet/action-needs-items */}
  <BottomSheet open={open} onOpenChange={setOpen} type="action" title="Share" />
  {/* expect: chat/others-need-author */}
  <ChatMessage side="others" onReact={react}>Hi there</ChatMessage>
  {/* expect: ai-chat/no-actions-while-streaming */}
  <AiChatBubble side="ai" streaming actions={[{ icon: "icon-copy-line", label: "Copy", onClick: copy }]}>Working</AiChatBubble>
  {/* expect: chart/stack-needs-legend */}
  <StackBarChart aria-label="Budget" data={data} series={series} showLegend={false} />
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
  {/* expect: color-selector/token-values */}
  <ColorSelector aria-label="Label colour" colors={[{ value: "#2563eb", label: "Blue" }, { value: "#16a34a", label: "Green" }]} />
  {/* expect: icon/size-token */}
  <Icon name="icon-check-line" size="small" decorative />
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
  {/* expect: top-navigation/max-two-trailing */}
  <TopNavigation title="Inbox" collapsed={collapsed} controlBar={<Search placeholder="Search messages" />} searchAction={{ onClick: openSearch }} trailing={[{ icon: "icon-edit-02-line", label: "New message", onClick: compose }, { icon: "icon-dots-horizontal-line", label: "More", onClick: openMore }]} />
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
  {/* expect: visually-hidden/focusable-shows */}
  <VisuallyHidden as="a" href="#main">Skip to main content</VisuallyHidden>
  {/* expect: heading/h1-is-heading-1 */}
  <Heading level={1} textStyle="Heading/3">Billing</Heading>
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
  <Card theme="border"><Button appearance="flat" level="primary" size="sm">Duplicate</Button></Card>
  {/* expect: interaction/action-without-handler */}
  <Sidebar sections={sections} onItemClick={go} footer={<button type="button"><Icon name="icon-trash-line" /><span>Trash</span></button>} />
  {/* expect: interaction/action-without-handler */}
  <BottomSheet open={open} onOpenChange={setOpen} type="action" title="Create" items={createItems} />
  {/* expect: interaction/action-without-handler */}
  <Breadcrumbs items={[{ id: "settings", label: "Settings" }, { id: "billing", label: "Billing" }]} />
</>;
