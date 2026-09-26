// Every element violates exactly one rule; the rule id is in the comment on the line above.
export const Bad = () => <>
  {/* expect: button/secondary-justified */}
  <Button level="secondary">Share</Button>
  {/* expect: button/filter-is-chip */}
  <Button level="tertiary" aria-haspopup="listbox">Sort: Name</Button>
  {/* expect: button/accent-is-promoted */}
  <Button level="accent">Save</Button>
  {/* expect: button/destructive-is-danger */}
  <Button level="primary">Delete project</Button>
  {/* expect: icon-button/needs-name */}
  <IconButton level="tertiary" icon={<Icon name="icon-plus-line" />} />
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
  <Tooltip content="This tooltip explains far too much about the feature and should really be inline help or a popover"><IconButton aria-label="Info" icon={<Icon name="icon-info-circle-line" />} /></Tooltip>
  {/* expect: tabs/needs-label */}
  <Tabs items={tabs} value={tab} onChange={setTab} />
  {/* expect: segmented/needs-label */}
  <Segmented options={views} value={view} onChange={setView} />
  {/* expect: dialog/needs-title */}
  <Dialog open={open} onOpenChange={setOpen} primaryAction={{ label: "OK" }} />
  {/* expect: dialog/negative-uses-danger */}
  <Dialog open={open} onOpenChange={setOpen} theme="negative" title="Delete?" primaryAction={{ label: "Delete" }} />
  {/* expect: popover/controlled-close */}
  <Popover open={open} items={items} />
  {/* expect: progress/needs-label */}
  <ProgressBar value={40} />
</>;
