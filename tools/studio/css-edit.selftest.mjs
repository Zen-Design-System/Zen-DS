// Self-test of tools/studio/css-edit.mjs (Main component M2): run with `node tools/studio/css-edit.selftest.mjs`.
import { definedTokens, editDeclaration, isComponentCss, normalizeSelector, tokenOf } from "./css-edit.mjs";

let failed = 0;
const ok = (name, value) => {
  if (!value) { failed += 1; console.log(`✗ ${name}`); }
};
const throws = (name, fn, code) => {
  try { fn(); ok(`${name} (no error)`, false); } catch (error) { ok(`${name}: ${error.code} ${error.message}`, error.code === code); }
};

const tokens = definedTokens([":root { --zen-spacing-gap-small: 12px; --zen-spacing-gap-xsmall: 8px; --zen-button-gap: 0; --zen-dm-24: 24px; }"]);
const css = `.zen-button {
  --zen-button-gap: var(--zen-spacing-gap-small);
  gap: var(--zen-button-gap);
}

/* XS */
.zen-button[data-size='xs'],
.zen-button[data-size=xsmall] {
  --zen-button-gap: var(--zen-spacing-gap-small);
  height: var(--zen-dm-24); /* keep */
}

@media (max-width: 600px) {
  .zen-button[data-size="xs"] { --zen-button-gap: var(--zen-spacing-gap-small); }
}
`;

ok("component css", isComponentCss("src/components/Button/button.css") && !isComponentCss("src/styles/tokens.css") && !isComponentCss("src/components/Button/../x.css"));
ok("selector quotes", normalizeSelector(".zen-button[data-size=xs]") === '.zen-button[data-size="xs"]' && normalizeSelector(".a  >  .b:is( .c ,.d )") === ".a>.b:is(.c,.d)");
ok("token of", tokenOf("var(--zen-dm-24)") === "--zen-dm-24" && tokenOf("var(--zen-dm-24, 4px)") === null && tokenOf("12px") === null);

const edited = editDeclaration(css, { selector: '.zen-button[data-size="xs"]', prop: "--zen-button-gap", value: "var(--zen-spacing-gap-xsmall)" }, tokens);
ok("edits the scoped rule only", edited.css.includes("[data-size=xsmall] {\n  --zen-button-gap: var(--zen-spacing-gap-xsmall);") && edited.css.startsWith(".zen-button {\n  --zen-button-gap: var(--zen-spacing-gap-small);"));
ok("keeps the @media rule", edited.css.includes('.zen-button[data-size="xs"] { --zen-button-gap: var(--zen-spacing-gap-small); }'));
ok("keeps comments and the rest", edited.css.includes("/* XS */") && edited.css.includes("/* keep */") && edited.css.split("\n").length === css.split("\n").length);
ok("reports the line", edited.line === 9);
const inMedia = editDeclaration(css, { selector: '.zen-button[data-size="xs"]', media: "(max-width:600px)", prop: "--zen-button-gap", value: "var(--zen-spacing-gap-xsmall)" }, tokens);
ok("edits inside @media", inMedia.css.includes('{ --zen-button-gap: var(--zen-spacing-gap-xsmall); }') && inMedia.css.includes("[data-size=xsmall] {\n  --zen-button-gap: var(--zen-spacing-gap-small);"));

throws("raw value refused", () => editDeclaration(css, { selector: ".zen-button", prop: "gap", value: "10px" }, tokens), "invalid");
throws("unknown token refused", () => editDeclaration(css, { selector: ".zen-button", prop: "gap", value: "var(--zen-made-up)" }, tokens), "invalid");
throws("self reference refused", () => editDeclaration(css, { selector: ".zen-button", prop: "--zen-button-gap", value: "var(--zen-button-gap)" }, tokens), "invalid");
throws("missing declaration", () => editDeclaration(css, { selector: ".zen-button", prop: "padding", value: "var(--zen-dm-24)" }, tokens), "not-found");
throws("missing rule", () => editDeclaration(css, { selector: ".zen-badge", prop: "gap", value: "var(--zen-dm-24)" }, tokens), "not-found");

console.log(failed ? `✗ css-edit selftest: ${failed} failed` : "✓ css-edit selftest");
process.exit(failed ? 1 : 0);
