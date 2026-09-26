import { useState, type ReactNode } from "react";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { SelectField } from "../components/Input";

const codeLanguages = ["React", "Vue", "Svelte", "HTML", "Swift", "Flutter"] as const;

const codeTokenPattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|<\/?[A-Za-z][^>\n]*>|\b(?:import|from|export|const|let|return|function|true|false|null|undefined|as|type|interface)\b|\b\d+(?:\.\d+)?\b)/g;
const codeKeywords = new Set(["import", "from", "export", "const", "let", "return", "function", "true", "false", "null", "undefined", "as", "type", "interface"]);

function highlightCode(source: string): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  codeTokenPattern.lastIndex = 0;
  while ((match = codeTokenPattern.exec(source)) !== null) {
    if (match.index > cursor) nodes.push(source.slice(cursor, match.index));
    const token = match[0];
    const className = token.startsWith("//") || token.startsWith("/*")
      ? "platform-code__token platform-code__token--comment"
      : token.startsWith("<")
        ? "platform-code__token platform-code__token--tag"
        : token.startsWith("\"") || token.startsWith("'") || token.startsWith("`")
          ? "platform-code__token platform-code__token--string"
          : codeKeywords.has(token)
            ? "platform-code__token platform-code__token--keyword"
            : "platform-code__token platform-code__token--number";
    nodes.push(<span className={className} key={`${match.index}-${token}`}>{token}</span>);
    cursor = match.index + token.length;
  }
  if (cursor < source.length) nodes.push(source.slice(cursor));
  return nodes;
}

export function PlatformCode({ code }: { code: string }) {
  const [language, setLanguage] = useState<(typeof codeLanguages)[number]>("React");
  const [copied, setCopied] = useState(false);
  const output = language === "React" ? code : `// ${language} — Coming Soon\n// React is the reference implementation for this component.`;
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="platform-code" aria-label="Code preview">
      <div className="platform-code__header">
        <div className="platform-code__language-group">
          <SelectField
            aria-label="Code language"
            className="platform-code__language"
            size="small"
            value={language}
            onChange={(event) => setLanguage(event.target.value as (typeof codeLanguages)[number])}
            options={codeLanguages.map((item) => ({ value: item, label: `${item}${item === "React" ? "" : " — Coming Soon"}` }))}
          />
        </div>
        <Button appearance="main" level="tertiary" size="sm" endIcon={<Icon name={"icon-copy-line" as IconName} decorative />} onClick={copyCode}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre><code>{highlightCode(output)}</code></pre>
    </section>
  );
}
