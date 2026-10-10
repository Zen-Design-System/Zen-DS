import "./progressive-blur.css";

const LAYERS = [0, 1, 2, 3, 4, 5];

/**
 * Figma's progressive background blur under a bar (progressive-blur.css): the blur grows linearly toward the `strong`
 * edge, up to the owner's `--zen-progressive-blur`. Decorative; the owner's class positions it.
 */
export function ProgressiveBlur({ className, strong }: { className: string; strong: "top" | "bottom" }) {
  return (
    <span className={`zen-progressive-blur ${className}`} data-strong={strong} aria-hidden="true">
      {LAYERS.map((layer) => <i key={layer} />)}
    </span>
  );
}
