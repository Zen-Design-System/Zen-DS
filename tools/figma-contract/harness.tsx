/*
 * Test page for the Figma contract checker. Renders every case in window.__CASES
 * with the real production components and global styles.
 */
import { createRoot } from "react-dom/client";
import "../../src/styles/fonts.css";
import "../../src/styles/reset.css";
import "../../src/styles/tokens.css";
import "../../src/styles/typography.css";
import "../../src/styles/style-effects.css";
import { cases } from "./cases";

type Case = { id: string; kind: string; props: Record<string, unknown> };
const list = (window as unknown as { __CASES: Case[] }).__CASES;

function App() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 48, padding: 48, alignItems: "flex-start" }}>
      {list.map((item) => (
        <div key={item.id} data-case={item.id} style={{ position: "relative", display: "inline-flex" }}>
          {cases[item.kind](item.props)}
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
