// Style-guard fixture (TSX): correct usage, must report nothing.
export function Good({ gap, stat }: { gap: string; stat: { value: string } }) {
  return (
    <div style={{ padding: "var(--zen-spacing-padding-medium)", gap, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Heading level={3} textStyle="Heading/4">Invoices</Heading>
      <Text as="span" textStyle="Heading/3">{stat.value}</Text>
      <Sidebar logo={<Text as="span" textStyle="Heading/4">Acme</Text>} />
      <h3 className={typographyStyles["Heading/4"]}>Card title</h3>
      <h2 className="platform-main-component__title">Playground panel title (platform chrome)</h2>
      <p style={{ margin: 0, lineHeight: 1 }}>Tight</p>
      {/* zen-allow-raw-radius: Figma 123:4 masks the photo with a 6px corner. */}
      <img style={{ borderRadius: 6 }} alt="" />
      <div style={{ position: "sticky", top: 0 }} />
    </div>
  );
}
