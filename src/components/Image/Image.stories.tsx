import type { Meta, StoryObj } from "@storybook/react-vite";
import photo from "../../assets/media/site-santorini.webp";
import { List, ListItem } from "../ListItem";
import { Image, Thumbnail, imageFits, imageRatios, thumbnailShapes } from "./Image";

/** Bytes that are not an image: the browser fails to decode them without a network request (the error state). */
const broken = "data:image/png;base64,AAAA";

const meta = {
  title: "Components/Image",
  component: Image,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "A picture in a ratio frame with a Skeleton while loading, a neutral placeholder on error and an optional figure caption. Thumbnail is the fixed-size square for rows and tables." } } },
  args: { src: photo, alt: "White houses and a windmill by the sea", ratio: "4:3", fit: "cover", radius: "md", loading: "lazy" },
  argTypes: { ratio: { control: "select", options: imageRatios }, fit: { control: "inline-radio", options: imageFits } },
  decorators: [(Story) => <div style={{ maxWidth: 420 }}><Story /></div>],
} satisfies Meta<typeof Image>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const WithCaption: Story = { args: { caption: "Oia, Santorini — photo by the travel team" } };
export const Loading: Story = { args: { src: undefined } };
export const Failed: Story = { args: { src: broken } };

export const Thumbnails: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {thumbnailShapes.map((shape) => (
        <div key={shape} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {(["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((size) => <Thumbnail key={size} src={photo} alt="" size={size} shape={shape} />)}
          <Thumbnail src={broken} alt="Missing photo" size="lg" shape={shape} />
        </div>
      ))}
      <List aria-label="Uploads">
        <ListItem title="santorini.webp" caption="1.2 MB · Uploaded 2 hours ago" leading={<Thumbnail src={photo} alt="" />} />
      </List>
    </div>
  ),
};
