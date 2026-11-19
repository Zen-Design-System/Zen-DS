import { useState } from "react";
import {
  Accordion, AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, BadgeCounter, Box, Checkbox, Chip, ChipGroup, Grid, Heading,
  Image, Menu, Search, Stack, Tabs, Text, VisuallyHidden, useToast,
} from "@zen-ds/react";
import { me, photos, type Photo } from "../../data";

/** The brand at the start of a top bar: Figma Brand = Avatar/Single Square Small Neutral Solid + the name in Heading/4. */
function Brand({ initial, name }: { initial: string; name: string }) {
  return (
    // Hug: the brand keeps its width beside the Tabs, which scroll when the row is short.
    <Stack direction="row" gap="xs" align="center" width="hug">
      <Avatar size="sm" shape="square" theme="neutral" background="solid" alt="">{initial}</Avatar>
      <Text as="span" textStyle="Heading/4">{name}</Text>
    </Stack>
  );
}

/** The account button at the end of the top row, in its menu (Profile, Settings, Sign out). */
function AccountMenu() {
  const { toast } = useToast();
  return (
    <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
      { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: "Your profile opens here." }) },
      { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Notifications, security and billing." }) },
      { type: "separator" },
      { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: "See you soon." }) },
    ]} />
  );
}

type Product = { id: string; name: string; colour: string; price: number; was?: number; off?: string; tags: string[]; photo: Photo };
const shoes = photos.products;
/* Figma B1's grid, in its order (Sort: Newest), with the photo each Figma tile holds. */
const products: Product[] = [
  { id: "urbas-offwhite", name: "Urbas Love+ Slip On", colour: "Offwhite", price: 42, was: 49, off: "-15%", tags: ["lifestyle", "vegan"], photo: shoes.offwhite },
  { id: "urbas-sand", name: "Urbas Love+ Slip On", colour: "Warm Sand", price: 49, tags: ["lifestyle", "vegan"], photo: shoes.sand },
  { id: "vintas-soda", name: "Vintas Soda Pop High", colour: "Red Violet", price: 58, tags: ["high-tops", "lifestyle"], photo: shoes.redViolet },
  { id: "track-classic", name: "Track 6 Classic Low", colour: "Blue Ash", price: 62, was: 72, off: "-14%", tags: ["running"], photo: shoes.silver },
  { id: "pattas-olive", name: "Pattas Polka Low", colour: "Olive", price: 45, tags: ["lifestyle", "vegan"], photo: shoes.olive },
  { id: "basas-gum", name: "Basas Bumper Gum", colour: "Black Gum", price: 39, tags: ["lifestyle"], photo: shoes.black },
  { id: "vintas-mister", name: "Vintas Mister Hi", colour: "Ivory", price: 54, tags: ["high-tops"], photo: shoes.navy },
  { id: "track-earth", name: "Track 6 Earth", colour: "Mud Brown", price: 66, tags: ["running", "vegan"], photo: shoes.cap },
];
const departments = [
  { id: "new", label: "New in", title: "New arrivals" },
  { id: "women", label: "Women", title: "Women" },
  { id: "men", label: "Men", title: "Men" },
  { id: "kids", label: "Kids", title: "Kids" },
  { id: "sale", label: "Sale", title: "Sale" },
];
const quickFilters = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "high-tops", label: "High-tops" },
  { value: "under-80", label: "Under $80" },
  { value: "vegan", label: "Vegan" },
];
const sorts = [
  { id: "newest", label: "Newest" },
  { id: "price-low", label: "Price: low to high" },
  { id: "price-high", label: "Price: high to low" },
];
/* The filter rail: Category open (Figma Expanded=Yes, Sneakers and Slip-ons ticked), the others closed. */
const filterGroups = [
  { id: "category", title: "Category", options: ["Sneakers", "Boots", "Sandals", "Slip-ons", "Accessories"] },
  { id: "size", title: "Size", options: ["EU 38", "EU 39", "EU 40", "EU 41", "EU 42", "EU 43"] },
  { id: "colour", title: "Colour", options: ["Black", "White", "Beige", "Red", "Blue", "Olive"] },
  { id: "price", title: "Price", options: ["Under $50", "$50 – $80", "Over $80"] },
  { id: "rating", title: "Rating", options: ["4 stars and up", "3 stars and up"] },
];
const dollars = (amount: number) => `$${amount}`;

function ProductTile({ product }: { product: Product }) {
  return (
    <Stack as="li" gap="sm">
      <Image src={product.photo.src} alt="" ratio="1:1" radius="lg" />
      <Stack gap="2xs">
        <Text textStyle="Body/Base/Medium">{product.name}</Text>
        <Text textStyle="Body/Small/Regular" tone="light">{product.colour}</Text>
        <Stack direction="row" gap="xs" align="center">
          <Text as="span" textStyle="Body/Base/Bold">{dollars(product.price)}</Text>
          {product.was ? <>
            <Text as="span" textStyle="Body/Small/Regular" tone="light"><VisuallyHidden>Was </VisuallyHidden><del>{dollars(product.was)}</del></Text>
            <Badge size="xs" theme="red" background="solid" leadingIcon={false}>{product.off}</Badge>
          </> : null}
        </Stack>
      </Stack>
    </Stack>
  );
}

/** A sneaker store: the catalogue is the navigation (Figma ◇ Master-Layout B1, Layout=Top-Bar on Canvas/Flat). */
export default function StorefrontApp() {
  const { toast } = useToast();
  const [department, setDepartment] = useState("new");
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState("all");
  const [sort, setSort] = useState("newest");
  const [ticked, setTicked] = useState<Record<string, boolean>>({ "category:Sneakers": true, "category:Slip-ons": true });
  const shown = products
    .filter((product) => quick === "all" || (quick === "under-80" ? product.price < 80 : product.tags.includes(quick)))
    .sort((a, b) => (sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : 0));
  const title = departments.find((item) => item.id === department)?.title ?? "New arrivals";
  const sortLabel = sorts.find((item) => item.id === sort)?.label ?? "Newest";
  return (
    // Top-Bar on Canvas/Flat: no Sidebar, the catalogue is the navigation. The header keeps only its top row (Figma
    // Main=false): the brand and a Subtle Tab-Bar, then Search and the shopper's actions.
    <AppShell pattern="top-bar" canvas="flat"
      header={(
        <AppShellHeader
          leading={(
            <Stack direction="row" gap="xl" align="center">
              <Brand initial="N" name="Northwind" />
              <Tabs variant="subtle" aria-label="Departments" value={department} onValueChange={setDepartment}
                items={departments.map(({ id, label }) => ({ id, label }))} />
            </Stack>
          )}
          actions={<>
            <Box width={280}><Search placeholder="Search shoes, bags, brands" aria-label="Search the store" value={query} onValueChange={setQuery} /></Box>
            <AppShellAction icon="icon-heart-line" aria-label="Wishlist" onClick={() => toast({ title: "Your wishlist is empty", children: "Save a product to keep it here." })} />
            <AppShellAction icon="icon-shopping-bag-01-line" aria-label="Bag" count={2} onClick={() => toast({ title: "2 items in your bag", children: "Basas Bumper Gum · Track 6 Earth" })} />
            <AccountMenu />
          </>}
        />
      )}
    >
      {/* The page title row comes first, so the outline starts at the h1 and the filter rail's h2 sits under it; then
          the catalogue: the filter rail (240) beside the results, Gap/XLarge apart, one ladder step more than the
          results' own Gap/Large (Figma draws 48, no ladder step). In a narrow window the rail stacks above the results
          and the grid keeps two columns. */}
      <Stack gap="xl">
        <Stack direction="row" gap="md" align="center" justify="between" wrap>
          <Stack direction="row" gap="sm" align="center">
            <Heading level={1} textStyle="Display/3">{title}</Heading>
            {/* zen-allow-counter-cap: a result total, shown in full as Figma's 960 (not an unread count). */}
            <BadgeCounter size="md" theme="neutral" background="solid" value={960} />
          </Stack>
          <Chip variant="advanced" level="secondary" size="md" popoverLabel="Sort by"
            popoverItems={sorts.map((item) => ({ id: item.id, label: item.label, selected: item.id === sort }))}
            onPopoverSelect={(item) => setSort(item.id)}>
            {`Sort: ${sortLabel}`}
          </Chip>
        </Stack>
        <Grid columns="240px minmax(0, 1fr)" gap="xl" align="start" stackBelow={640}>
          <Stack as="aside" gap="md" aria-label="Filters">
            <Stack gap="2xs">
              <Heading level={2} textStyle="Heading/Subheading">Filters</Heading>
              <Text textStyle="Body/Small/Regular" tone="light">960 results</Text>
            </Stack>
            <Stack gap="none">
              {filterGroups.map((group) => (
                <Accordion key={group.id} title={group.title} size="sm" theme="divider" contentWidth="full" defaultExpanded={group.id === "category"}>
                  <Stack gap="sm">
                    {group.options.map((option) => {
                      const key = `${group.id}:${option}`;
                      return <Checkbox key={key} label={option} checked={Boolean(ticked[key])} onCheckedChange={(checked) => setTicked((all) => ({ ...all, [key]: checked }))} />;
                    })}
                  </Stack>
                </Accordion>
              ))}
            </Stack>
          </Stack>
          <Stack gap="lg">
            <ChipGroup aria-label="Quick filters" size="md" level="secondary" options={quickFilters} value={quick} onValueChange={setQuick} />
            {/* Product-Grid: 4 columns (2 on a phone), 24 across and 32 down; products have no box, only a Pale image tile. */}
            <Grid as="ul" columns={{ mobile: 2, desktop: 4 }} columnGap="lg" rowGap="xl" aria-label={`${title}, sorted by ${sortLabel.toLowerCase()}`}>
              {shown.map((product) => <ProductTile key={product.id} product={product} />)}
            </Grid>
          </Stack>
        </Grid>
      </Stack>
    </AppShell>
  );
}
