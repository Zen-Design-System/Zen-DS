import { iconAliases } from "../../icons/generated/aliases";
import { iconBucket, iconBucketLoaders } from "../../icons/generated/loaders";
import type { IconDefinition, IconName } from "../../icons/generated/names";

/**
 * Icon registry. It starts empty. The icons Zen components draw themselves (the core set, ~100) are registered by
 * `./core`, which every component with a built-in icon imports, so they paint on the first frame; an app that only uses
 * components without built-in icons (Button, Tabs…) never ships them. Every icon, core ones included, also sits in one
 * of the small lazy buckets and is fetched the first time an <Icon> asks for it. So `<Icon name="…">` keeps working for
 * all 1,598 names while an app only pays for the icons it renders.
 *
 * - `registerIcons(record)` adds definitions (e.g. your own SVGs, or a bucket you bundled yourself).
 * - `preloadIcons(names)` fetches buckets ahead of time (no empty frame on first paint).
 * - `import "@zen-ds/react/icons/all"` registers the whole set up front (docs, galleries, no lazy loading).
 */
const registry = new Map<string, IconDefinition>();
const bucketLoads = new Map<number, Promise<void>>();

export function registerIcons(icons: Partial<Record<IconName | (string & {}), IconDefinition>>): void {
  for (const [name, icon] of Object.entries(icons)) if (icon) registry.set(name, icon);
}

/** The icon a name draws: a plain alias (`icon-search-line`) draws its Medium cut, any other name itself. */
export function resolveIconName(name: string): string {
  return iconAliases[name] ?? name;
}

/** The definition if it is already registered (core, preloaded or loaded earlier), else undefined. */
export function getRegisteredIcon(name: string): IconDefinition | undefined {
  return registry.get(name) ?? registry.get(resolveIconName(name));
}

/** Loads the bucket that holds `name` (once; the same promise is returned while it is pending or after it settled). */
export function loadIconBucket(name: string): Promise<void> {
  const index = iconBucket(resolveIconName(name));
  let load = bucketLoads.get(index);
  if (!load) {
    load = iconBucketLoaders[index]()
      .then((bucket) => registerIcons(bucket.default))
      .catch((error: unknown) => {
        // Let a later render retry (offline, deploy in progress…) instead of caching the failure forever.
        bucketLoads.delete(index);
        if (isDev()) console.warn(`[zen] Could not load icon bucket ${index} for "${name}".`, error);
      });
    bucketLoads.set(index, load);
  }
  return load;
}

/** Fetches the buckets of these icons so they draw without an empty first frame. */
export function preloadIcons(names: ReadonlyArray<IconName | (string & {})>): Promise<void> {
  return Promise.all(names.filter((name) => !getRegisteredIcon(name)).map(loadIconBucket)).then(() => undefined);
}

// Bundlers replace `process.env.NODE_ENV` statically (keep the exact expression); without one, `process` is missing.
declare const process: { env: { NODE_ENV?: string } };

/** True in development builds (dev warnings only). */
export function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

const warned = new Set<string>();
/** Dev only: an unknown name renders nothing, so say which names come closest. */
export function warnUnknownIcon(name: string): void {
  if (!isDev() || warned.has(name)) return;
  warned.add(name);
  void import("../../icons/generated/names").then(({ iconNames }) => {
    const distance = (a: string, b: string) => {
      const row = Array.from({ length: b.length + 1 }, (_, index) => index);
      for (let i = 1; i <= a.length; i += 1) {
        let previous = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
          const current = row[j];
          row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
          previous = current;
        }
      }
      return row[b.length];
    };
    const closest = [...iconNames].sort((a, b) => distance(name, a) - distance(name, b)).slice(0, 3);
    console.warn(`[zen] Unknown icon "${name}". Closest names: ${closest.join(", ")}.`);
  });
}
