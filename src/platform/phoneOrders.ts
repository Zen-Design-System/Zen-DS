import { platformMedia, type PlatformPhoto } from "./PlatformMedia";

/*
 * Ava Chen's print orders from the studio shop: the Orders root and the order screen of the phone typography examples
 * (Typography › Content hierarchy, App layer › Text). Newest first; today is Wednesday, Sep 30, 2026. Long enough for the
 * Orders large title to fold as the list scrolls (14 rows).
 */
export type PhonePrint = { name: string; size: string; price: number; photo: PlatformPhoto };

export const phonePrints = {
  windmill: { name: "Windmill by the sea", size: "40 × 30 cm", price: 48, photo: platformMedia.site[3] },
  rooftops: { name: "Old town rooftops", size: "40 × 30 cm", price: 42, photo: platformMedia.site[1] },
  bridge: { name: "Bridge at dusk", size: "50 × 40 cm", price: 56, photo: platformMedia.site[4] },
  college: { name: "College courtyard", size: "30 × 20 cm", price: 34, photo: platformMedia.site[0] },
  hill: { name: "Old town from the hill", size: "40 × 30 cm", price: 42, photo: platformMedia.site[2] },
  cafe: { name: "Morning café", size: "30 × 20 cm", price: 32, photo: platformMedia.site[5] },
  sunset: { name: "Field at sunset", size: "50 × 40 cm", price: 56, photo: platformMedia.feed[0] },
  creek: { name: "Forest creek", size: "40 × 30 cm", price: 44, photo: platformMedia.feed[1] },
} satisfies Record<string, PhonePrint>;

export type PhoneOrder = {
  id: string;
  /** The key status: the order screen's first line and the row caption. */
  status: string;
  /** One sentence under the status. */
  note: string;
  items: Array<{ print: keyof typeof phonePrints; qty: number }>;
};

const delivered = "Signed for by Ava Chen.";
export const phoneOrders: PhoneOrder[] = [
  { id: "#1042", status: "Arriving Thursday", note: "Your order left the warehouse this morning.", items: [{ print: "windmill", qty: 1 }, { print: "rooftops", qty: 2 }] },
  { id: "#1041", status: "Ships by Friday", note: "We're packing your prints.", items: [{ print: "bridge", qty: 1 }] },
  { id: "#1040", status: "Arriving Friday", note: "Your order is with the courier.", items: [{ print: "cafe", qty: 2 }, { print: "college", qty: 1 }] },
  { id: "#1038", status: "Delivered Sep 22", note: delivered, items: [{ print: "sunset", qty: 1 }] },
  { id: "#1036", status: "Delivered Sep 19", note: delivered, items: [{ print: "creek", qty: 1 }, { print: "hill", qty: 1 }] },
  { id: "#1035", status: "Cancelled Sep 17", note: "Refunded to your card on Sep 18.", items: [{ print: "windmill", qty: 1 }] },
  { id: "#1033", status: "Delivered Sep 14", note: delivered, items: [{ print: "rooftops", qty: 1 }] },
  { id: "#1031", status: "Delivered Sep 9", note: delivered, items: [{ print: "college", qty: 2 }] },
  { id: "#1029", status: "Delivered Sep 4", note: delivered, items: [{ print: "bridge", qty: 1 }, { print: "cafe", qty: 1 }] },
  { id: "#1027", status: "Delivered Aug 28", note: delivered, items: [{ print: "hill", qty: 1 }] },
  { id: "#1024", status: "Delivered Aug 21", note: delivered, items: [{ print: "sunset", qty: 1 }, { print: "creek", qty: 1 }] },
  { id: "#1021", status: "Delivered Aug 12", note: delivered, items: [{ print: "windmill", qty: 2 }] },
  { id: "#1018", status: "Delivered Jul 30", note: delivered, items: [{ print: "cafe", qty: 1 }] },
  { id: "#1015", status: "Delivered Jul 18", note: delivered, items: [{ print: "rooftops", qty: 1 }, { print: "college", qty: 1 }] },
];

export const phoneOrderAddress = "Ava Chen, 12 Nguyen Hue, District 1, Ho Chi Minh City";
export const phoneShipping = 8;
export const phoneMoney = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const phoneOrderPrints = (order: PhoneOrder) => order.items.reduce((sum, item) => sum + item.qty, 0);
export const phoneOrderSubtotal = (order: PhoneOrder) => order.items.reduce((sum, item) => sum + item.qty * phonePrints[item.print].price, 0);
