import { useId, useState, type RefObject } from "react";
import {
  AppShell, Avatar, Badge, BadgeCounter, BottomNavigation, Box, ChipGroup, Grid, IconButton, Image, Stack, Text, TopNavigation, useToast,
  type BottomNavigationItem,
} from "@zen-ds/react";
import { photos, type Photo } from "../../data";

/* Figma ◇ Master-Layout · Example › E · Consumer apps › E3 · Product list (15991:9787): one Pattern/AppShell/Mobile,
   Top=Bar Transparent with the chips in its Control-Bar · Bottom=Tab-Bar · one cart FAB. The copy, numbers, variants
   and pictures are the Figma screen's. */

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
const listCollections = [
  { value: "all", label: "All" },
  { value: "promo", label: "Promo" },
  { value: "best", label: "Best deals" },
  { value: "basics", label: "Basics" },
];
const listProducts: Product[] = [
  { id: "basas-bumper", name: "Basas Bumper Gum", detail: "Colour · Navy", price: "$39", tags: ["basics", "best"], photo: photos.products.black },
  { id: "earth-cap", name: "Track 6 Earth Cap", detail: "Colour · White", price: "$66", tags: ["promo"], photo: photos.products.cap },
  { id: "vintas-mider", name: "Vintas Mider I-II", detail: "Colour · Blue", price: "$54", tags: ["best"], photo: photos.products.navy },
  { id: "classic-low", name: "Track 6 Classic Low", detail: "Colour · Silver", price: "$62", tags: ["basics", "promo"], photo: photos.products.silver },
];
/** The five best sellers at the foot of Figma's Featured-Brand, with the photo each Figma thumb holds. */
const bestSellers = [
  { name: "Love+ Slip On", photo: photos.products.offwhite },
  { name: "Corluray Mix", photo: photos.products.sand },
  { name: "Pattas Tomo", photo: photos.products.redViolet },
  { name: "Vintas Jazico", photo: photos.products.silver },
  { name: "Basas Workaday", photo: photos.products.olive },
];

function FeaturedBrand() {
  const { toast } = useToast();
  const [following, setFollowing] = useState(false);
  const titleId = useId();
  return (
    // Figma Featured-Brand: a 2XLarge photo frame; the brand row on a Surface plate at the top, five thumbnails at the foot.
    <Box as="section" radius="2xl" clip height={262} aria-labelledby={titleId}>
      <Box position="absolute" constraintX="left-right" constraintY="top-bottom">
        <Image src={photos.campaign.src} alt={photos.campaign.alt} ratio={350 / 262} radius="none" />
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

/** A product list: Back, the section title and the collections in the bar, a featured brand, the grid and the cart FAB. */
// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function ProductList({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("shop");
  const [collection, setCollection] = useState("all");
  const gridId = useId();
  return (
    // Bar + Tab-Bar: Back, the section title and Search on the Canvas, the collections as Chips in the Control-Bar; a
    // featured brand, a two-column grid, and the cart as the one floating action with its counter.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" title="Popular products"
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
  );
}
