// A page title as a React component name, on its own so the Studio's HTML export and pictures can name things without
// loading the compiler (compile.mjs re-exports it; build-check: "the React compiler is a chunk of its own").

/** "Checkout · Pay" → "CheckoutPay" (ASCII letters and digits, a letter first). */
export function componentName(title) {
  const words = String(title ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").split(/[^A-Za-z0-9]+/).filter(Boolean);
  const name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
  return /^[A-Za-z]/.test(name) ? name : `Studio${name}`;
}
