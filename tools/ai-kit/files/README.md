# Zen AI kit for Figma

Everything an AI agent needs to design screens in a Zen Figma file that a Zen designer accepts: the skill, the audit
harness and the Zen rules as Markdown. Works with Claude (Claude Code, the Claude app) and with ChatGPT/Codex, through
Figma's MCP server.

## What is inside

| Path | What |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md` | Project instructions (the same text): put one at the root of the project your agent works in |
| `skills/zen-figma-design/SKILL.md` | The skill: setup, hard rules, how to build a screen, the audit loop, the report |
| `skills/zen-figma-design/harness/zen-figma-audit.js` | The harness: a read-only Figma Plugin API script the agent runs with `use_figma` after every screen (unbound colours, spacing, radii, text styles, effects, overrides inside instances, lost icon colours, overflow, clipping, crushed text, placeholder copy) |
| `skills/zen-figma-design/references/screen-rules.md` | Surfaces, the spacing ladder, which component for which need, patterns that went wrong before, the review checklist |
| `skills/zen-figma-design/references/figma-components.md` | Every Zen component set with its exact property names and values (generated from the live Figma file) |
| `skills/zen-figma-design/references/figma-tokens.md` | The variables and styles to bind: semantic colours, spacing, radii, breakpoints, text and effect styles (generated) |
| `skills/zen-figma-design/references/figma-gotchas.md` | Plugin API behaviours that broke Zen screens, and what works |
| `skills/zen-figma-design/references/audit-rules.md` | Each audit rule and its fix |
| `skills/zen-figma-design/references/component-usage-rules.md`, `guidelines/*.md` | Zen's full usage rules and one guideline per component (Do/Don't, when to use what) |

## Set up

You need a Figma account with edit access to the file, and the file must use Zen (the Zen library, or a copy of the
Zen file).

### Claude Code

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

Then run `/mcp` in Claude Code to sign in to Figma. Copy `skills/zen-figma-design` to `~/.claude/skills/` (every
project) or to `<project>/.claude/skills/`, and put `CLAUDE.md` at the root of the project.

### Claude app (web or desktop)

Connect Figma under Settings › Connectors. Zip the `skills/zen-figma-design` folder and upload it under
Settings › Capabilities › Skills. In a Project, paste `CLAUDE.md` into the project instructions.

### Codex (ChatGPT's coding agent: CLI, IDE extension or app)

```bash
codex mcp add figma --url https://mcp.figma.com/mcp
```

```bash
codex mcp login figma
```

Copy `skills/zen-figma-design` to `~/.codex/skills/`, and put `AGENTS.md` at the root of the project.

### ChatGPT (chat)

Create a Project, paste `AGENTS.md` into its instructions and add `SKILL.md`, the `references/*.md` files and
`harness/zen-figma-audit.js` as project files. Editing a Figma file needs the Figma MCP server's `use_figma` tool: add
Figma as a connector if your workspace allows MCP connectors (developer mode); otherwise use Codex above.

## Start

Give the agent the file link and a brief, for example:

> Use the zen-figma-design skill. In https://www.figma.com/design/<file>/…, on the page "Orders", design the order
> list and order detail screens for a shop admin (desktop, Vietnamese copy). Audit each screen before the next.

The agent reads the file, builds one screen at a time from Zen components and variables, runs the audit until it
reports 0 errors, reviews a screenshot, and reports each screen with its audit result.

## Keep it current

The kit is built from the Zen DS repo, so it follows the live Figma library and the latest rules. Download it again
from the Zen platform (Installation › AI kit for Figma) after a Zen release; `VERSION.txt` says when yours was built.
