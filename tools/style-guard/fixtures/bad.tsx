// Style-guard fixture (TSX): inline styles and JSX typography. Every rule marked below must fire exactly once.
export function Bad() {
  return (
    <div>
      {/* expect: spacing/token */}
      <div style={{ padding: 12 }} />
      {/* expect: radius/token */}
      <div style={{ borderRadius: "10px" }} />
      {/* expect: type/token */}
      <p style={{ fontSize: 13 }}>Small print</p>
      {/* expect: color/token */}
      <p style={{ color: "#333" }}>Grey</p>
      {/* expect: color/role */}
      <p style={{ color: "var(--zen-color-border-neutral-subtle-default)" }}>Faint</p>
      {/* expect: shadow/token */}
      <div style={{ boxShadow: "0 2px 8px var(--zen-color-shadow-neutral-default)" }} />
      {/* expect: type/visual-heading */}
      <Text textStyle="Heading/4">Invoices</Text>
      {/* expect: type/raw-heading */}
      <h3>Recent activity</h3>
      {/* expect: position/token */}
      <div style={{ position: "absolute", top: 8, right: "var(--zen-spacing-padding-small)" }} />
    </div>
  );
}
