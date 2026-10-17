/*
 * What Figma's number fields accept when you type (pure; numberMath.selftest.mjs): a number, an expression ("100/3",
 * "(24+8)*2"), or a change of the current value led by an operator ("+8", "-4", "*2", "/2"). Nothing else runs: the
 * parser knows digits, the decimal point, + - * / and parentheses.
 */

/** The value typed into a field showing `current`, or null when it is not a number or an expression. */
export function evaluateNumber(input: string, current: number | null): number | null {
  const text = input.trim().replace(/(px|°|%)$/i, "").replace(/,/g, ".").replace(/[×x]/g, "*").replace(/÷/g, "/").trim();
  if (!text) return null;
  const relative = /^[*/]/.test(text) || (/^[+]/.test(text) && current !== null);
  const source = relative && current !== null ? `${current}${text}` : text;
  let at = 0;
  const peek = () => source[at];
  const skip = () => { while (source[at] === " ") at += 1; };
  function number(): number | null {
    skip();
    if (peek() === "(") {
      at += 1;
      const inner = sum();
      skip();
      if (peek() !== ")") return null;
      at += 1;
      return inner;
    }
    if (peek() === "-" || peek() === "+") {
      const sign = peek() === "-" ? -1 : 1;
      at += 1;
      const inner = number();
      return inner === null ? null : sign * inner;
    }
    const match = /^\d*\.?\d+(?:e[+-]?\d+)?/i.exec(source.slice(at));
    if (!match) return null;
    at += match[0].length;
    return Number(match[0]);
  }
  function product(): number | null {
    let left = number();
    for (;;) {
      skip();
      const op = peek();
      if (left === null || (op !== "*" && op !== "/")) return left;
      at += 1;
      const right = number();
      if (right === null || (op === "/" && right === 0)) return null;
      left = op === "*" ? left * right : left / right;
    }
  }
  function sum(): number | null {
    let left = product();
    for (;;) {
      skip();
      const op = peek();
      if (left === null || (op !== "+" && op !== "-")) return left;
      at += 1;
      const right = product();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
  }
  const value = sum();
  skip();
  return value !== null && at === source.length && Number.isFinite(value) ? value : null;
}

/** Figma's arrow keys: ±1, ⇧ ±10. */
export const arrowStep = (shift: boolean) => (shift ? 10 : 1);

/** Figma's label scrub: 1 per screen px of travel, ⇧ ×10. */
export const scrubValue = (base: number, travel: number, shift: boolean) => base + Math.round(travel) * (shift ? 10 : 1);
