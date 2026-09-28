import unionLogo from "../assets/figma/sidebar/union.svg";
import { Icon } from "../components/Icon";

/**
 * Figma's sample branding for the Sidebar examples: the Zen wordmark, the collapsed Zen mark and the "Kaiz" product
 * badge. The Sidebar itself ships no product branding; apps pass their own `logo` / `logoCollapsed` / `productName`.
 */
export const figmaSidebarBrand = {
  logo: <img src={unionLogo} alt="" />,
  logoCollapsed: <Icon name="icon-zen" size={28} decorative />,
  productName: "Kaiz",
};
