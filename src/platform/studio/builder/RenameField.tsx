import { useEffect, useRef, useState } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";

/**
 * A page's or folder's name edited in place in the Pages list, as Figma renames a layer (user, 2026-10-10: "cho phép
 * double click sửa tên folder, project trực tiếp trên list"): it opens selected; Enter or leaving it saves, Escape keeps
 * the name. An empty or unchanged name saves nothing.
 */
export function RenameField({ value, label, onCommit, onDone }: { value: string; label: string; onCommit: (name: string) => Promise<void>; onDone: () => void }) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  const finish = (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const name = text.trim();
    if (save && name && name !== value) void onCommit(name).finally(onDone);
    else onDone();
  };
  return (
    <input
      ref={inputRef}
      className={`studio-pages__rename ${typographyStyles["Body/Small/Medium"]}`}
      aria-label={label}
      value={text}
      spellCheck={false}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); finish(true); }
        else if (event.key === "Escape") { event.preventDefault(); finish(false); }
      }}
      onBlur={() => finish(true)}
    />
  );
}
