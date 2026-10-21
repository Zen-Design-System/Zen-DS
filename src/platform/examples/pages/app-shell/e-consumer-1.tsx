/* App Shell examples · e-consumer-1: built from Figma ◇ Master-Layout · Example (15902:109717), section
   "E · Consumer apps" (15991:9672): E1 · Delivery home (15991:9673), E2 · Shop home (15991:9731), E3 · Product list
   (15991:9787) and E4 · Onboarding (15991:9843). Each phone is one Pattern/AppShell/Mobile instance; the copy, numbers and
   component variants are the ones the Figma screens hold, and so are the pictures (platformMedia, exported from Figma). */
import { type ReactNode, useId, useState } from "react";
import { AppShell } from "../../../../components/AppShell";
import { Avatar } from "../../../../components/Avatar";
import { Badge, BadgeCounter } from "../../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../../components/BottomNavigation";
import { Button, IconButton } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Chip } from "../../../../components/Chip";
import { ChipGroup } from "../../../../components/ChipGroup";
import { DockIcon } from "../../../../components/DockIcon";
import { Icon, type IconName } from "../../../../components/Icon";
import { Image } from "../../../../components/Image";
import { InputLeadingTrailing } from "../../../../components/Input";
import { Box, Grid, Stack } from "../../../../components/Layout";
import { Link } from "../../../../components/Link";
import { List, ListItem } from "../../../../components/ListItem";
import { MetricCard } from "../../../../components/MetricWidget";
import { Search } from "../../../../components/Search";
import { Heading, Text } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { TopNavigation } from "../../../../components/TopNavigation";
import { platformMedia, type PlatformPhoto } from "../../../PlatformMedia";
import { PlatformPhone } from "../../../PlatformPhone";
import type { ExampleDef } from "../../types";
import "./app-shell.css";

// ——— Shared parts ————————————————————————————————————————————————————————————————————————————————————————————

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

/** A shortcut tile (Figma: a 56 mark over its Body/Small label): the mark is the button, named by the label under it. */
/** Figma shortcut tile: a Large mark (Dock Icon or Avatar, 56) over its Body/Small label. The whole tile is the button and
 *  its visible label is the name (app-shell.css), so the mark keeps its 56px instead of sitting in a button's icon slot. */
function ShortcutTile({ label, mark, onClick }: { label: string; mark: ReactNode; onClick: () => void }) {
  return (
    <li>
      <button type="button" className="px-shell-shortcut" onClick={onClick}>
        {mark}
        <Text as="span" textStyle="Body/Small/Regular">{label}</Text>
      </button>
    </li>
  );
}

type Product = { id: string; name: string; detail: string; price: string; tags: string[]; badge?: string; photo: PlatformPhoto };

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

// ——— E1 · Delivery home (Top=Band on Support/Brand · Bottom=Tab-Bar) ——————————————————————————————————————————
const deliveryRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
  { id: "orders", label: "Orders", icon: "icon-package-line", selectedIcon: "icon-package-solid" },
  { id: "deals", label: "Deals", icon: "icon-ticket-01-line", selectedIcon: "icon-ticket-01-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const campuses = [
  { id: "riverside", label: "Riverside Campus", caption: "Dorm B · Room 214" },
  { id: "north", label: "North Campus", caption: "Library, main entrance" },
  { id: "home", label: "Home", caption: "12 Ly Tu Trong, District 1" },
];
const categories = [
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "dessert", label: "Dessert", emoji: "🧁" },
  { id: "market", label: "Market", emoji: "🛒" },
  { id: "fruit", label: "Fruit", emoji: "🍎" },
  { id: "pharmacy", label: "Pharmacy", emoji: "💊" },
  { id: "coupons", label: "Coupons", emoji: "🎟️" },
  { id: "drinks", label: "Drinks", emoji: "🧋" },
  { id: "canteen", label: "Canteen", emoji: "🍱" },
  { id: "new", label: "New here", emoji: "🎓" },
  { id: "snacks", label: "Snacks", emoji: "🍿" },
];
const deals = [
  { id: "lunch-box", shelf: "Canteen", name: "Lunch box", price: "$8.60", photo: platformMedia.food.bento },
  { id: "hot-pot", shelf: "Deals", name: "Hot pot for two", price: "$16.90", photo: platformMedia.food.hotpot },
];
const storeFilters: { id: string; label: string; leading?: IconName }[] = [
  { id: "free", label: "Free delivery", leading: "icon-truck-line" },
  { id: "top", label: "Top rated" },
  { id: "fast", label: "20 min" },
];

function DeliveryHomePhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [campus, setCampus] = useState(campuses[0].id);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<string[]>(["free"]);
  const [cart, setCart] = useState(0);
  const campusLabel = campuses.find((item) => item.id === campus)?.label ?? campuses[0].label;
  const toggle = (id: string) => setFilters((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  return (
    <PlatformPhone label="Delivery app" canvas="default">
      {/* Band + Tab-Bar: the band runs from the top edge with the delivery address and the bell in its bar, then the big
          hello beside the mascot and the search. The page below: emoji shelves, two Shadow deal cards, filter chips and
          the nearest store. */}
      <AppShell mobileTop="band" band="soft"
        topNavigation={<TopNavigation aria-label="Delivery address"
          leading={<Chip variant="advanced" leading="icon-marker-pin-01-solid" dropdown popoverLabel="Deliver to"
            popoverItems={campuses.map((item) => ({ ...item, selected: item.id === campus }))}
            onPopoverSelect={(item) => { setCampus(item.id); toast({ title: `Delivering to ${String(item.label)}`, children: item.caption }); }}>{campusLabel}</Chip>}
          trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: () => toast({ title: "Your bubble tea is on its way", children: "Magoz Coffee · arriving in 12 min" }) }]} />}
        hero={(
          <Stack gap="md">
            <Stack direction="row" justify="between" align="center" gap="md">
              <Heading level={1} textStyle="Display/2">Hi,<br />fellow!</Heading>
              {/* Figma Character: the 100 × 100 cut-out mascot (Fit), beside the greeting it illustrates; a bare image fill in
                  Figma, so frame={false}: no Neutral/Pale square around it. */}
              <Box width={100}>
                <Image src={platformMedia.food.mascot.src} alt="" ratio="1:1" fit="contain" frame={false} radius="none" loading="eager" />
              </Box>
            </Stack>
            <Search placeholder="Burgers, bubble tea, phở…" aria-label="Search food and stores" value={query} onValueChange={setQuery}
              onKeyDown={(event) => { if (event.key === "Enter" && query) toast({ title: `Searching “${query}”`, children: `Near ${campusLabel}` }); }} />
          </Stack>
        )}
        bottomNavigation={<BottomNavigation aria-label="Delivery app" value={root} onValueChange={setRoot} showLabels items={deliveryRoots} />}
      >
        <Stack gap="xl">
          <Grid as="ul" columns={5} gap="none" rowGap="md" aria-label="Categories">
            {categories.map((item) => (
              <ShortcutTile key={item.id} label={item.label} mark={<DockIcon theme="emoji" emoji={item.emoji} size="lg" />}
                onClick={() => toast({ title: item.label, children: `Stores that deliver to ${campusLabel}` })} />
            ))}
          </Grid>
          <Stack direction="row" gap="sm" fillChildren>
            {deals.map((deal) => (
              <Card key={deal.id} theme="shadow" aria-label={`${deal.shelf}: ${deal.name}, ${deal.price}`}
                onClick={() => toast({ title: `${deal.name} · ${deal.price}`, children: `From ${deal.shelf}`, action: { label: "Add", onClick: () => setCart((count) => count + 1) } })}>
                <Stack gap="xs">
                  <Text textStyle="Body/Base/Bold">{deal.shelf}</Text>
                  <Image src={deal.photo.src} alt="" ratio={129 / 88} radius="lg" />
                  <Stack gap="2xs">
                    <Text textStyle="Body/Small/Regular">{deal.name}</Text>
                    <Text textStyle="Body/Base/Bold" tone="accent-base" tabularNumbers>{deal.price}</Text>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
          <Stack as="section" gap="md" aria-label="Stores near you">
            <Stack direction="row" gap="xs" scroll="x" paddingY="3xs">
              {storeFilters.map((filter) => (
                <Chip key={filter.id} variant="normal" level="primary" leading={filter.leading} selected={filters.includes(filter.id)} onClick={() => toggle(filter.id)}>{filter.label}</Chip>
              ))}
            </Stack>
            <List aria-label="Stores near you">
              <ListItem title="Magoz Coffee" caption="★ 4.6 · 6,328 orders · 32 min"
                leading={<DockIcon theme="emoji" emoji="☕" size="lg" />}
                onClick={() => toast({ title: "Magoz Coffee", children: "Open until 22:00 · free delivery" })}
                trailing={<IconButton appearance="flat" level="primary" icon="icon-plus-line" aria-label="Quick add from Magoz Coffee"
                  onClick={() => { setCart((count) => count + 1); toast({ title: "Iced latte added", children: `${cart + 1} in your basket` }); }} />} />
            </List>
          </Stack>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— E2 · Shop home (Top=Band · Bottom=Tab-Bar) ——————————————————————————————————————————————————————————————
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
  { id: "urbas-love", name: "Urbas Love+ Slip On", detail: "Off white · 3 colours", price: "$42", tags: ["best", "new"], badge: "New", photo: platformMedia.products.offwhite },
  { id: "vintas-soda", name: "Vintas Soda Pop High", detail: "Pink · 2 colours", price: "$58", tags: ["promo"], photo: platformMedia.products.redViolet },
];

function ShopHomePhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [collection, setCollection] = useState("all");
  const [cartSeen, setCartSeen] = useState(false);
  const brandsId = useId();
  const popularId = useId();
  return (
    <PlatformPhone label="Sneaker shop" canvas="default">
      {/* Band + Tab-Bar: the two-line hello with the bell and the cart (its dot) in the band, the search under it. On the
          grey Canvas: five Accent shortcuts, the two wallet tiles, round brand Avatars and the product grid. */}
      <AppShell mobileTop="band" band="pale"
        topNavigation={<TopNavigation largeTitle="Blair Chen" largeTitleCapline="Hello,"
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
    </PlatformPhone>
  );
}

// ——— E3 · Product list (Top=Bar Transparent with the chips in its Control-Bar · Bottom=Tab-Bar · one cart FAB) ——————
const listCollections = [
  { value: "all", label: "All" },
  { value: "promo", label: "Promo" },
  { value: "best", label: "Best deals" },
  { value: "basics", label: "Basics" },
];
const listProducts: Product[] = [
  { id: "basas-bumper", name: "Basas Bumper Gum", detail: "Colour · Navy", price: "$39", tags: ["basics", "best"], photo: platformMedia.products.black },
  { id: "earth-cap", name: "Track 6 Earth Cap", detail: "Colour · White", price: "$66", tags: ["promo"], photo: platformMedia.products.cap },
  { id: "vintas-mider", name: "Vintas Mider I-II", detail: "Colour · Blue", price: "$54", tags: ["best"], photo: platformMedia.products.navy },
  { id: "classic-low", name: "Track 6 Classic Low", detail: "Colour · Silver", price: "$62", tags: ["basics", "promo"], photo: platformMedia.products.silver },
];
/** The five best sellers at the foot of Figma's Featured-Brand, with the photo each Figma thumb holds. */
const bestSellers = [
  { name: "Love+ Slip On", photo: platformMedia.products.offwhite },
  { name: "Corluray Mix", photo: platformMedia.products.sand },
  { name: "Pattas Tomo", photo: platformMedia.products.redViolet },
  { name: "Vintas Jazico", photo: platformMedia.products.silver },
  { name: "Basas Workaday", photo: platformMedia.products.olive },
];

function FeaturedBrand() {
  const { toast } = useToast();
  const [following, setFollowing] = useState(false);
  const titleId = useId();
  return (
    // Figma Featured-Brand: a 2XLarge photo frame; the brand row on a Surface plate at the top, five thumbnails at the foot.
    <Box as="section" radius="2xl" clip height={262} aria-labelledby={titleId}>
      <Box position="absolute" constraintX="left-right" constraintY="top-bottom">
        <Image src={platformMedia.campaign.src} alt={platformMedia.campaign.alt} ratio={350 / 262} radius="none" />
      </Box>
      <Stack justify="between" height="fill">
        <Box padding="sm">
          {/* Concentric: the plate's corner is the Avatar's (Corner-Radius/Base 12) plus its 8 inset, XLarge 20. */}
          <Box surface="surface" radius="xl" padding="xs">
            <Stack direction="row" gap="sm" align="center">
              <Avatar size="md" shape="square" theme="neutral" background="subtle" alt="">Ur</Avatar>
              <Stack gap="none" width="fill">
                <Text id={titleId} textStyle="Body/Base/Bold">Urbas Studio</Text>
                <Text textStyle="Body/Small/Regular" tone="base">★ 4.8 · {following ? "2,400,001" : "2.4M"} followers</Text>
              </Stack>
              <IconButton size="sm" level="tertiary" icon={following ? "icon-heart-solid" : "icon-heart-line"} aria-label="Follow Urbas Studio" aria-pressed={following}
                onClick={() => { setFollowing((value) => !value); toast({ title: following ? "Unfollowed Urbas Studio" : "Following Urbas Studio", children: following ? undefined : "New drops show on your Home." }); }} />
            </Stack>
          </Box>
        </Box>
        <Stack as="ul" direction="row" gap="xs" padding="sm" aria-label="Urbas Studio best sellers">
          {bestSellers.map((item) => (
            <Box as="li" key={item.name} width={52}>
              <Image src={item.photo.src} alt={item.name} ratio="1:1" radius="md" />
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

function ProductListPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("shop");
  const [collection, setCollection] = useState("all");
  const gridId = useId();
  return (
    <PlatformPhone label="Sneaker shop" canvas="default">
      {/* Bar + Tab-Bar: Back, the section title and Search on the Canvas, the collections as Chips in the Control-Bar; a
          featured brand, a two-column grid, and the cart as the one floating action with its counter. */}
      <AppShell
        topNavigation={<TopNavigation type="transparent" title="Popular products"
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Home" }) }}
          trailing={[{ icon: "icon-search-large-line", label: "Search products", onClick: () => toast({ title: "Search products", children: "Brands, models and colours" }) }]}
          controlBar={<ChipGroup aria-label="Collections" options={listCollections} value={collection} onValueChange={setCollection} />} />}
        bottomNavigation={<BottomNavigation aria-label="Sneaker shop" value={root} onValueChange={setRoot} showLabels items={shopRoots} />}
        floatingActions={(
          <Box>
            <IconButton size="xl" level="primary" icon="icon-shopping-cart-line" aria-label="Cart, 12 items" onClick={() => toast({ title: "12 items in your cart", children: "Free delivery from $50" })} />
            <Box position="absolute" constraintX="right" insetTop={-8} insetRight={-8} aria-hidden="true">
              <BadgeCounter theme="accent" value="12" />
            </Box>
          </Box>
        )}
      >
        <Stack gap="xl">
          <FeaturedBrand />
          <Grid as="ul" columns={2} columnGap="sm" rowGap="lg" aria-label="Popular products" id={gridId}>
            {listProducts.filter((product) => collection === "all" || product.tags.includes(collection)).map((product) => (
              <ProductTile key={product.id} product={product} priceStyle="Body/Extra/Bold" />
            ))}
          </Grid>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— E4 · Onboarding (Top=Band-Sheet · Bottom=None) ——————————————————————————————————————————————————————————
/** Figma Collage (390 × 330, no auto layout): five portraits in Corner-Radius/Giant frames with a 4px Surface ring, fanned
 *  out at these X / Y, and the Small Tertiary "+" under them. X is scaled to the hero's 350 inner width. */
const portraits = [
  { photo: platformMedia.portraits.redHair, x: 9, y: 64, width: 96, height: 128 },
  { photo: platformMedia.portraits.shortHair, x: 66, y: 30, width: 104, height: 140 },
  { photo: platformMedia.portraits.curlyHoodie, x: 119, y: 96, width: 124, height: 168 },
  { photo: platformMedia.portraits.curlyHair, x: 185, y: 44, width: 104, height: 140 },
  { photo: platformMedia.portraits.smile, x: 253, y: 76, width: 96, height: 128 },
];

function OnboardingPhone() {
  const { toast } = useToast();
  return (
    <PlatformPhone label="Family stories app" canvas="surface">
      {/* Band-Sheet, no bottom bar: the brand mark over the Pale band where the faces fan out, then the Surface sheet with
          the promise, the Primary Get started, the phone option and Sign in. */}
      <AppShell mobileTop="band-sheet" band="pale"
        topNavigation={<TopNavigation headingLevel="h1" title={(
          <Stack direction="row" gap="xs" align="center">
            <Icon name="icon-git-branch-01-line" size="xl" tone="accent-base" decorative />
            <Text as="span" textStyle="Heading/2">kindred</Text>
          </Stack>
        )} />}
        hero={(
          <Box height={330}>
            {portraits.map(({ photo, x, y, width, height }) => (
              <Box key={photo.src} position="absolute" insetLeft={x} insetTop={y} width={width} height={height} surface="surface" radius="3xl" padding="2xs">
                <Image src={photo.src} alt={photo.alt} ratio={(width - 8) / (height - 8)} radius="2xl" loading="eager" />
              </Box>
            ))}
            <Box position="absolute" constraintX="center" insetTop={274}>
              <IconButton size="sm" level="tertiary" icon="icon-plus-line" aria-label="Add a relative" onClick={() => toast({ title: "Add a relative", children: "Start with a parent or a grandparent." })} />
            </Box>
          </Box>
        )}
      >
        <Stack gap="md" align="stretch">
          <Stack gap="xs">
            <Heading level={2} textStyle="Heading/2" align="center">Explore generations, records and family stories.</Heading>
            <Text tone="base" align="center">Find the people who shaped your journey and keep their stories together.</Text>
          </Stack>
          <Button size="lg" level="primary" onClick={() => toast({ title: "Let's start your tree", children: "Add yourself first, then your parents." })}>Get started</Button>
          <Button size="lg" level="tertiary" startIcon="icon-phone-line" onClick={() => toast({ title: "Continue with phone", children: "We text you a 6-digit code." })}>Continue with phone</Button>
          <Stack direction="row" gap="xs" align="center" alignSelf="center">
            <Text textStyle="Body/Small/Regular" tone="base">Already have an account?</Text>
            <Button appearance="flat" size="sm" level="primary" onClick={() => toast({ title: "Sign in", children: "With your phone or email." })}>Sign in</Button>
          </Stack>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "E1 · Delivery home",
    description: "A Support/Brand/Soft band runs from the top edge: the delivery address, a Display/2 greeting next to a 3D mascot with its background removed and the search. Ten emoji category tiles in two rows, two Shadow deal cards with food photos and Accent prices, filter Chips (one selected) and the nearest stores as List-Items. Shell: AppShell/Mobile · Phone · Top=Band · Bottom=Tab-Bar. Fits: Food delivery, Grocery, Campus services, Quick commerce.",
    render: () => <DeliveryHomePhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    mobileTop="band"
    band="soft"
    topNavigation={<TopNavigation aria-label="Delivery address"
      leading={<Chip variant="advanced" leading="icon-marker-pin-01-solid" dropdown popoverLabel="Deliver to"
        popoverItems={campuses} onPopoverSelect={(item) => setCampus(item.id)}>Riverside Campus</Chip>}
      trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: openNotifications }]} />}
    hero={(
      <Stack gap="md">
        <Stack direction="row" justify="between" align="center" gap="md">
          <Heading level={1} textStyle="Display/2">Hi,<br />fellow!</Heading>
          <Box width={100}><Image src={mascot.src} alt="" ratio="1:1" fit="contain" frame={false} radius="none" loading="eager" /></Box>
        </Stack>
        <Search placeholder="Burgers, bubble tea, phở…" aria-label="Search food and stores" value={query} onValueChange={setQuery} />
      </Stack>
    )}
    bottomNavigation={<BottomNavigation aria-label="Delivery app" value={root} onValueChange={setRoot} showLabels items={[
      { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
      { id: "orders", label: "Orders", icon: "icon-package-line", selectedIcon: "icon-package-solid" }, …
    ]} />}
  >
    <Stack gap="xl">
      <Grid as="ul" columns={5} gap="none" rowGap="md" aria-label="Categories">
        {/* The whole tile is the button; its visible label is the name. */}
        <li>
          <button type="button" className="shortcut" onClick={openFood}>
            <DockIcon theme="emoji" emoji="🍜" size="lg" />
            <Text as="span" textStyle="Body/Small/Regular">Food</Text>
          </button>
        </li>
        …Dessert · Market · Fruit · Pharmacy · Coupons · Drinks · Canteen · New here · Snacks
      </Grid>
      <Stack direction="row" gap="sm" fillChildren>
        <Card theme="shadow" aria-label="Canteen: Lunch box, $8.60" onClick={openDeal}>
          <Stack gap="xs">
            <Text textStyle="Body/Base/Bold">Canteen</Text>
            <Image src={lunchBox.photo} alt="" ratio={129 / 88} radius="lg" />
            <Stack gap="2xs">
              <Text textStyle="Body/Small/Regular">Lunch box</Text>
              <Text textStyle="Body/Base/Bold" tone="accent-base">$8.60</Text>
            </Stack>
          </Stack>
        </Card>
        …Deals · Hot pot for two · $16.90
      </Stack>
      <Stack as="section" gap="md" aria-label="Stores near you">
        <Stack direction="row" gap="xs" scroll="x" paddingY="3xs">
          <Chip variant="normal" level="primary" leading="icon-truck-line" selected={free} onClick={toggleFree}>Free delivery</Chip>
          <Chip variant="normal" level="primary" selected={topRated} onClick={toggleTopRated}>Top rated</Chip>
          <Chip variant="normal" level="primary" selected={fast} onClick={toggleFast}>20 min</Chip>
        </Stack>
        <List aria-label="Stores near you">
          <ListItem title="Magoz Coffee" caption="★ 4.6 · 6,328 orders · 32 min" onClick={openStore}
            leading={<DockIcon theme="emoji" emoji="☕" size="lg" />}
            trailing={<IconButton appearance="flat" level="primary" icon="icon-plus-line" aria-label="Quick add from Magoz Coffee" onClick={quickAdd} />} />
        </List>
      </Stack>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "E2 · Shop home",
    description: "A Support/Brand/Pale band from the top edge holds a two-line greeting and the bell and cart actions (the cart with a dot), then the search. Five Accent Subtle shortcuts (one hue, never five), two wallet tiles, round brand Avatars and the product grid with Chips. Each product photo carries a heart action. Shell: AppShell/Mobile · Phone · Top=Band · Bottom=Tab-Bar. Fits: Fashion, Marketplace, Loyalty, Sneakers.",
    render: () => <ShopHomePhone />,
    code: `<AppShell
  mobileTop="band"
  band="pale"
  topNavigation={<TopNavigation largeTitle="Blair Chen" largeTitleCapline="Hello,"
    largeTitleAction={[
      { icon: "icon-bell-01-line", label: "Notifications", onClick: openNotifications },
      { icon: "icon-shopping-cart-line", label: "Cart, 2 items", dot: true, onClick: openCart },
    ]} />}
  hero={<Search placeholder="What are you looking for?" aria-label="Search the shop"
    trailing={<InputLeadingTrailing icon={<Icon name="icon-scan-line" decorative />} aria-label="Scan a product code" onClick={scan} />} />}
  bottomNavigation={<BottomNavigation aria-label="Sneaker shop" value={root} onValueChange={setRoot} showLabels items={roots} />}
>
  <Stack gap="xl">
    <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-label="Shortcuts">
      {/* The whole tile is the button; its visible label is the name. */}
      <li>
        <button type="button" className="shortcut" onClick={openGreatBuy}>
          <DockIcon icon="icon-shopping-bag-02-line" theme="accent" background="subtle" size="lg" />
          <Text as="span" textStyle="Body/Small/Regular">Great buy</Text>
        </button>
      </li>
      …Flash · Gifts · Coupons · VIP
    </Stack>
    <Stack direction="row" gap="sm" fillChildren>
      <MetricCard type="tile" size="sm" spacing="md" label="Balance" value="$1,920.10" icon="icon-wallet-02-line" iconBackground="subtle" />
      <MetricCard type="tile" size="sm" spacing="md" label="Points" value="19,204" icon="icon-coins-line" iconBackground="subtle" />
    </Stack>
    <Stack as="section" gap="sm" aria-labelledby="brands">
      …Curated brands · See all (a Link)
      …five <Avatar size="lg" theme="neutral" background="subtle" alt="">Ur</Avatar> tiles: Urbas · Vintas · Track 6 · Pattas · Basas
    </Stack>
    <Stack as="section" gap="md" aria-labelledby="popular">
      …Popular products · See all
      <Stack direction="row" gap="xs" scroll="x" paddingY="3xs" role="group" aria-label="Collections">
        <Chip variant="normal" level="primary" size="sm" selected={collection === "all"} onClick={() => setCollection("all")}>All</Chip>
        …Promo · Best deals · New in
      </Stack>
      <Grid as="ul" columns={2} gap="sm" aria-labelledby="popular">
        <Stack as="li" gap="2xs">
          <Box>
            <Image src={urbasLove.photo} alt="" ratio={169 / 140} radius="2xl" />
            <Box position="absolute" insetTop="xs" insetLeft="xs"><Badge size="sm" theme="accent">New</Badge></Box>
            <Box position="absolute" constraintX="right" insetTop="xs" insetRight="xs">
              <IconButton appearance="overlay" level="white" size="sm" icon="icon-heart-line" aria-label="Save Urbas Love+ Slip On" aria-pressed={saved} onClick={toggleSaved} />
            </Box>
          </Box>
          <Text textStyle="Body/Base/Medium" truncate>Urbas Love+ Slip On</Text>
          <Text textStyle="Body/Small/Regular" tone="base">Off white · 3 colours</Text>
          <Text textStyle="Body/Base/Bold" tabularNumbers>$42</Text>
        </Stack>
        …Vintas Soda Pop High · Pink · 2 colours · $58
      </Grid>
    </Stack>
  </Stack>
</AppShell>`,
  },
  {
    title: "E3 · Product list",
    description: "A compact bar with Back and the section title, Chips for the collections, a featured brand card (photo, rating, five thumbnails) and a two-column grid with name, colour and price. The cart is the one Accent action on screen, a floating IconButton with its counter. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. Fits: Fashion, Catalogue, Drops, Resale.",
    render: () => <ProductListPhone />,
    code: `<AppShell
  topNavigation={<TopNavigation type="transparent" title="Popular products"
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
    trailing={[{ icon: "icon-search-large-line", label: "Search products", onClick: openSearch }]}
    controlBar={<ChipGroup aria-label="Collections" value={collection} onValueChange={setCollection}
      options={[{ value: "all", label: "All" }, { value: "promo", label: "Promo" }, { value: "best", label: "Best deals" }, { value: "basics", label: "Basics" }]} />} />}
  bottomNavigation={<BottomNavigation aria-label="Sneaker shop" value="shop" onValueChange={setRoot} showLabels items={roots} />}
  floatingActions={(
    <Box>
      <IconButton size="xl" level="primary" icon="icon-shopping-cart-line" aria-label="Cart, 12 items" onClick={openCart} />
      <Box position="absolute" constraintX="right" insetTop={-8} insetRight={-8} aria-hidden="true">
        <BadgeCounter theme="accent" value="12" />
      </Box>
    </Box>
  )}
>
  <Stack gap="xl">
    <Box as="section" radius="2xl" clip height={262} aria-labelledby="featured">
      <Box position="absolute" constraintX="left-right" constraintY="top-bottom">
        <Image src={campaign.photo} alt={campaign.alt} ratio={350 / 262} radius="none" />
      </Box>
      <Stack justify="between" height="fill">
        <Box padding="sm">
          <Box surface="surface" radius="xl" padding="xs">
            <Stack direction="row" gap="sm" align="center">
              <Avatar size="md" shape="square" theme="neutral" background="subtle" alt="">Ur</Avatar>
              <Stack gap="none" width="fill">
                <Text id="featured" textStyle="Body/Base/Bold">Urbas Studio</Text>
                <Text textStyle="Body/Small/Regular" tone="base">★ 4.8 · 2.4M followers</Text>
              </Stack>
              <IconButton size="sm" level="tertiary" icon="icon-heart-line" aria-label="Follow Urbas Studio" aria-pressed={following} onClick={follow} />
            </Stack>
          </Box>
        </Box>
        <Stack as="ul" direction="row" gap="xs" padding="sm" aria-label="Urbas Studio best sellers">
          <Box as="li" width={52}><Image src={loveSlipOn.photo} alt="Love+ Slip On" ratio="1:1" radius="md" /></Box>
          …Corluray Mix · Pattas Tomo · Vintas Jazico · Basas Workaday
        </Stack>
      </Stack>
    </Box>
    <Grid as="ul" columns={2} columnGap="sm" rowGap="lg" aria-label="Popular products">
      …Basas Bumper Gum · Colour · Navy · $39 (Body/Extra/Bold) — the product tile of E2
      …Track 6 Earth Cap · Vintas Mider I-II · Track 6 Classic Low
    </Grid>
  </Stack>
</AppShell>`,
  },
  {
    title: "E4 · Onboarding",
    description: "The brand mark over a Support/Brand/Pale band where portrait photos fan out (rounded frames, a white ring each). A Surface sheet with rounded top corners carries the promise in Heading/2, the Primary Get started, a Continue with phone button and a Sign in link. Shell: AppShell/Mobile · Phone · Top=Band-Sheet · Bottom=None. Fits: Family / Genealogy, Community, Dating, Social.",
    render: () => <OnboardingPhone />,
    code: `<PlatformPhone canvas="surface">
  <AppShell
    mobileTop="band-sheet"
    band="pale"
    topNavigation={<TopNavigation title={(
      <Stack direction="row" gap="xs" align="center">
        <Icon name="icon-git-branch-01-line" size="xl" tone="accent-base" decorative />
        <Text as="span" textStyle="Heading/2">kindred</Text>
      </Stack>
    )} />}
    hero={(
      <Box height={330}>
        <Box position="absolute" insetLeft={9} insetTop={64} width={96} height={128} surface="surface" radius="3xl" padding="2xs">
          <Image src={redHair.src} alt="Young woman with long red hair" ratio={88 / 120} radius="2xl" loading="eager" />
        </Box>
        …four more portraits fanned out (104 × 140 · 124 × 168 · 104 × 140 · 96 × 128)
        <Box position="absolute" constraintX="center" insetTop={274}>
          <IconButton size="sm" level="tertiary" icon="icon-plus-line" aria-label="Add a relative" onClick={addRelative} />
        </Box>
      </Box>
    )}
  >
    <Stack gap="md" align="stretch">
      <Stack gap="xs">
        <Heading level={2} textStyle="Heading/2" align="center">Explore generations, records and family stories.</Heading>
        <Text tone="base" align="center">Find the people who shaped your journey and keep their stories together.</Text>
      </Stack>
      <Button size="lg" level="primary" onClick={getStarted}>Get started</Button>
      <Button size="lg" level="tertiary" startIcon="icon-phone-line" onClick={continueWithPhone}>Continue with phone</Button>
      <Stack direction="row" gap="xs" align="center" alignSelf="center">
        <Text textStyle="Body/Small/Regular" tone="base">Already have an account?</Text>
        <Button appearance="flat" size="sm" level="primary" onClick={signIn}>Sign in</Button>
      </Stack>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
];
