import { useId, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import {
  AppShell, Avatar, Badge, BottomNavigation, Box, Chip, DockIcon, Grid, Heading, Icon, IconButton, Image, InputLeadingTrailing, Link,
  MetricCard, Search, Stack, Text, TopNavigation, useToast, type BottomNavigationItem, type IconName,
} from "@zen-ds/react";
import { photos, type Photo } from "../../data";

/* Figma ◇ Master-Layout · Example › E · Consumer apps › E2 · Shop home (15991:9731): one Pattern/AppShell/Mobile,
   Top=Band · Bottom=Tab-Bar. The copy, numbers, variants and pictures are the Figma screen's. */

/** Figma Section-Header: the Heading/4 title and its See all (a Link: Zen's rule, Figma draws a Flat button). */
function SectionHeader({ id, title, onSeeAll }: { id: string; title: string; onSeeAll: () => void }) {
  return (
    <Stack direction="row" justify="between" align="center" gap="xs">
      <Heading level={2} id={id} textStyle="Heading/4">{title}</Heading>
      <Text as="span" textStyle="Body/Base/Bold">
        <Link as="button" tone="inherit" onClick={onSeeAll}>See all</Link>
      </Text>
    </Stack>
  );
}

/** The shortcut tile's button: the mark over its label, Gap/2XSmall apart, no fill at rest (nothing paints on hover). */
const tileButton: CSSProperties = {
  display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "var(--zen-spacing-gap-2-xsmall, 4px)",
  padding: 0, border: 0, borderRadius: "var(--zen-corner-radius-large, 16px)", background: "none", color: "inherit", cursor: "pointer",
};

/** Figma shortcut tile: a Large mark (Dock Icon or Avatar, 56) over its Body/Small label. The whole tile is the button and
 *  its visible label is the name, so the mark keeps its 56px instead of sitting in a button's icon slot. */
function ShortcutTile({ label, mark, onClick }: { label: string; mark: ReactNode; onClick: () => void }) {
  return (
    <li>
      <button type="button" style={tileButton} onClick={onClick}>
        {mark}
        <Text as="span" textStyle="Body/Small/Regular">{label}</Text>
      </button>
    </li>
  );
}

type Product = { id: string; name: string; detail: string; price: string; tags: string[]; badge?: string; photo: Photo };

/** Figma Product: the 169 × 140 photo (Corner-Radius/2XLarge) with the White overlay heart, then name, colour and price. */
function ProductTile({ product, priceStyle }: { product: Product; priceStyle: "Body/Base/Bold" | "Body/Extra/Bold" }) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  return (
    <Stack as="li" gap="2xs">
      <Box>
        <Image src={product.photo.src} alt="" ratio={169 / 140} radius="2xl" />
        {product.badge ? (
          <Box position="absolute" insetTop="xs" insetLeft="xs">
            <Badge size="sm" theme="accent">{product.badge}</Badge>
          </Box>
        ) : null}
        <Box position="absolute" constraintX="right" insetTop="xs" insetRight="xs">
          <IconButton appearance="overlay" level="white" size="sm" icon={saved ? "icon-heart-solid" : "icon-heart-line"}
            aria-label={`Save ${product.name}`} aria-pressed={saved}
            onClick={() => { setSaved((value) => !value); toast({ title: saved ? `Removed ${product.name}` : `Saved ${product.name}`, children: saved ? undefined : "Find it under Saved." }); }} />
        </Box>
      </Box>
      <Text textStyle="Body/Base/Medium" truncate>{product.name}</Text>
      <Text textStyle="Body/Small/Regular" tone="base">{product.detail}</Text>
      <Text textStyle={priceStyle} tabularNumbers>{product.price}</Text>
    </Stack>
  );
}

const shopRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
  { id: "shop", label: "Shop", icon: "icon-grid-01-line", selectedIcon: "icon-grid-01-solid" },
  { id: "saved", label: "Saved", icon: "icon-heart-line", selectedIcon: "icon-heart-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const shortcuts: { id: string; label: string; icon: IconName }[] = [
  { id: "great-buy", label: "Great buy", icon: "icon-shopping-bag-02-line" },
  { id: "flash", label: "Flash", icon: "icon-zap-line" },
  { id: "gifts", label: "Gifts", icon: "icon-gift-01-line" },
  { id: "coupons", label: "Coupons", icon: "icon-ticket-01-line" },
  { id: "vip", label: "VIP", icon: "icon-stars-01-line" },
];
const brands = [
  { id: "urbas", label: "Urbas", initials: "Ur" },
  { id: "vintas", label: "Vintas", initials: "Va" },
  { id: "track-6", label: "Track 6", initials: "Tr" },
  { id: "pattas", label: "Pattas", initials: "Pa" },
  { id: "basas", label: "Basas", initials: "Ba" },
];
const shopCollections = [
  { value: "all", label: "All" },
  { value: "promo", label: "Promo" },
  { value: "best", label: "Best deals" },
  { value: "new", label: "New in" },
];
const shopProducts: Product[] = [
  { id: "urbas-love", name: "Urbas Love+ Slip On", detail: "Off white · 3 colours", price: "$42", tags: ["best", "new"], badge: "New", photo: photos.products.offwhite },
  { id: "vintas-soda", name: "Vintas Soda Pop High", detail: "Pink · 2 colours", price: "$58", tags: ["promo"], photo: photos.products.redViolet },
];

/** A sneaker shop's home: a two-line hello and the search on a band, shortcuts, wallet tiles, brands and products. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function ShopHome({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [collection, setCollection] = useState("all");
  const [cartSeen, setCartSeen] = useState(false);
  const brandsId = useId();
  const popularId = useId();
  return (
    // Band + Tab-Bar: the two-line hello with the bell and the cart (its dot) in the band, the search under it. On the
    // grey Canvas: five Accent shortcuts, the two wallet tiles, round brand Avatars and the product grid.
    <AppShell mobileTop="band" band="pale"
      topNavigation={<TopNavigation scrollRef={scrollRef} largeTitle="Blair Chen" largeTitleCapline="Hello,"
        largeTitleAction={[
          { icon: "icon-bell-01-line", label: "Notifications", onClick: () => toast({ title: "Flash sale at 20:00", children: "Up to 40% off Vintas and Basas." }) },
          { icon: "icon-shopping-cart-line", label: cartSeen ? "Cart, 2 items" : "Cart, 2 items, updated", dot: !cartSeen, onClick: () => { setCartSeen(true); toast({ title: "2 items in your cart", children: "Urbas Love+ Slip On · Vintas Soda Pop High" }); } },
        ]} />}
      hero={<Search placeholder="What are you looking for?" aria-label="Search the shop"
        trailing={<InputLeadingTrailing icon={<Icon name="icon-scan-line" decorative />} aria-label="Scan a product code" onClick={() => toast({ title: "Point the camera at a barcode", children: "We find the pair and its sizes." })} />} />}
      bottomNavigation={<BottomNavigation aria-label="Sneaker shop" value={root} onValueChange={setRoot} showLabels items={shopRoots} />}
    >
      <Stack gap="xl">
        <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-label="Shortcuts">
          {shortcuts.map((item) => (
            <ShortcutTile key={item.id} label={item.label} mark={<DockIcon icon={item.icon} theme="accent" background="subtle" size="lg" />}
              onClick={() => toast({ title: item.label, children: "Today's picks for you" })} />
          ))}
        </Stack>
        <Stack direction="row" gap="sm" fillChildren>
          <MetricCard type="tile" size="sm" spacing="md" label="Balance" value="$1,920.10" icon="icon-wallet-02-line" iconBackground="subtle" />
          <MetricCard type="tile" size="sm" spacing="md" label="Points" value="19,204" icon="icon-coins-line" iconBackground="subtle" />
        </Stack>
        <Stack as="section" gap="sm" aria-labelledby={brandsId}>
          <SectionHeader id={brandsId} title="Curated brands" onSeeAll={() => toast({ title: "All brands", children: "42 brands, A to Z" })} />
          <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-labelledby={brandsId}>
            {brands.map((brand) => (
              <ShortcutTile key={brand.id} label={brand.label} mark={<Avatar size="lg" theme="neutral" background="subtle" alt="">{brand.initials}</Avatar>}
                onClick={() => toast({ title: brand.label, children: "New season and best sellers" })} />
            ))}
          </Stack>
        </Stack>
        <Stack as="section" gap="md" aria-labelledby={popularId}>
          <SectionHeader id={popularId} title="Popular products" onSeeAll={() => setRoot("shop")} />
          {/* Figma Collections: one row of Small Normal chips that runs past the edge, so it scrolls sideways (a ChipGroup wraps). */}
          <Stack direction="row" gap="xs" scroll="x" paddingY="3xs" role="group" aria-label="Collections">
            {shopCollections.map((item) => (
              <Chip key={item.value} variant="normal" level="primary" size="sm" selected={collection === item.value} onClick={() => setCollection(item.value)}>{item.label}</Chip>
            ))}
          </Stack>
          <Grid as="ul" columns={2} gap="sm" aria-labelledby={popularId}>
            {shopProducts.filter((product) => collection === "all" || product.tags.includes(collection)).map((product) => (
              <ProductTile key={product.id} product={product} priceStyle="Body/Base/Bold" />
            ))}
          </Grid>
        </Stack>
      </Stack>
    </AppShell>
  );
}
