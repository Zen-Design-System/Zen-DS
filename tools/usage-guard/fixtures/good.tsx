// Correct usage of every rule's subject: the harness must report nothing here.
export const Good = () => <>
  <Button level="primary">Save</Button>
  <Button level="tertiary">Cancel</Button>
  {/* zen-allow-secondary: pressed toolbar toggle */}
  <IconButton level="secondary" aria-label="Bold" aria-pressed icon={<Icon name="icon-bold-01-line" />} />
  <Button level="danger" onClick={remove}>Delete project</Button>
  <Chip variant="advanced" dropdown popoverItems={items}>Status</Chip>
  <InputField label="Name" readOnly />
  <InputField aria-label="Share link" readOnly value={link} />
  <InputField {...sharedFieldProps} />
  <Search placeholder="Search components" disabled />
  <Checkbox label="Remember me" checked={on} onChange={setOn} />
  <RadioButton name="plan" label="Monthly" checked />
  <Badge remove onRemove={() => drop("design")}>Design</Badge>
  <Tag remove onRemove={remove}>react</Tag>
  <BadgeCounter value="99+" />
  <Avatar theme="photo" src={url} alt="Ava Chen" />
  <Avatar theme="blue" alt="">AC</Avatar>
  <Tooltip content="Duplicate"><IconButton aria-label="Duplicate" icon={<Icon name="icon-copy-line" />} /></Tooltip>
  <Tabs aria-label="Settings" items={tabs} value={tab} onChange={setTab} />
  <Segmented aria-label="Layout" options={views} value={view} onChange={setView} />
  <Dialog open={open} onOpenChange={setOpen} theme="negative" title="Delete?" primaryAction={{ label: "Delete", level: "danger" }} />
  <Popover open={open} onOpenChange={setOpen} items={items} />
  <Popover open items={items} />
  <ProgressBar value={40} label />
  <ProgressCircle value={40} aria-label="Upload" />
</>;
