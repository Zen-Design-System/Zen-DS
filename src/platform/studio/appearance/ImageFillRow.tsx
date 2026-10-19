import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { coverCrop, cropOf, imageFillMode, type ImageCrop } from "../../../components/_shared/image-fill";
import { resolveMedia } from "../builder/library/media";
import { startCrop } from "../draw/CropHandles";
import { choosePictures, picturesOf } from "../draw/placeImage";
import { studioStore } from "../store";
import { PhotoControl } from "../inspector/controls/PhotoControl";
import { ScrubNumberField } from "../inspector/controls/ScrubNumberField";
import type { FieldApi } from "../inspector/fieldApi";
import { PropField } from "../inspector/PropField";
import type { PropSpec, PropValue } from "../inspector/propSchema";
import type { EditOp } from "../types";

/*
 * Figma's image fill in the Fill section (Studio parity F8), for a Shape and a frame (Box, Stack, Grid): the picture
 * (Your uploads, People, Library, or Upload… from the computer), how it fills the layer (Fill · Fit · Crop · Tile), a
 * Tile's scale, and − to take the picture away (its settings go with it, one edit). Switching to Crop keeps the picture
 * where Fill showed it (the crop written is Fill's visible part), as Figma does.
 */

const IMAGE_PROPS = ["image", "imageFit", "imageCrop", "imageScale"] as const;

const stringOf = (value: PropValue) => (value.state === "literal" && typeof value.value === "string" ? value.value : undefined);

/** The crop as written (`imageCrop={{ x: 10, … }}`): what the layer renders with, else the expression's numbers. */
function writtenCrop(value: PropValue): ImageCrop | null {
  if (value.state === "bound") {
    const live = cropOf(value.live);
    if (live) return live;
    const read = (name: string) => Number(new RegExp(`\\b${name}\\s*:\\s*(-?[\\d.]+)`).exec(value.expression)?.[1]);
    return cropOf({ x: read("x"), y: read("y"), width: read("width"), height: read("height") });
  }
  return null;
}

const cropCode = (crop: ImageCrop) => `{ x: ${crop.x}, y: ${crop.y}, width: ${crop.width}, height: ${crop.height} }`;

/** A picture's own size (to write Fill's crop when switching to Crop). */
const pictureSize = (src: string) => new Promise<{ width: number; height: number } | null>((resolve) => {
  const probe = new Image();
  probe.onload = () => resolve(probe.naturalWidth ? { width: probe.naturalWidth, height: probe.naturalHeight } : null);
  probe.onerror = () => resolve(null);
  probe.src = src;
});

export function ImageFillRow({ api, specs, host }: { api: FieldApi; specs: PropSpec[]; host: HTMLElement | null }) {
  const fitSpec = specs.find((candidate) => candidate.name === "imageFit");
  if (!specs.some((candidate) => candidate.name === "image")) return null;
  const image = stringOf(api.valueFor("image"));
  const fitValue = api.valueFor("imageFit");
  const mode = imageFillMode(fitValue.state === "literal" ? fitValue.value : undefined);
  const scale = api.valueFor("imageScale");
  const scaleShown = scale.state === "literal" && typeof scale.value === "number" ? scale.value : 100;

  const setImage = (src: string) => { void api.apply([{ op: "setProp", name: "image", value: { kind: "string", value: src } }], image ? "Replace image" : "Add image"); };
  const remove = () => { void api.apply(IMAGE_PROPS.filter((name) => api.valueFor(name).state !== "unset").map((name): EditOp => ({ op: "removeProp", name })), "Remove image"); };
  const upload = async () => {
    const [picture] = await picturesOf(await choosePictures());
    if (picture) setImage(picture.src);
  };
  const setFit = async (next: string) => {
    const ops: EditOp[] = next === "fill" ? [{ op: "removeProp", name: "imageFit" }] : [{ op: "setProp", name: "imageFit", value: { kind: "string", value: next } }];
    // Crop starts from what Fill shows (the picture stays where it is); the other modes drop a crop and a tile scale.
    if (next === "crop" && !writtenCrop(api.valueFor("imageCrop")) && image) {
      const own = await pictureSize(resolveMedia(image) ?? image);
      if (own && host) ops.push({ op: "setProp", name: "imageCrop", value: { kind: "expression", code: cropCode(coverCrop(own, { width: host.offsetWidth, height: host.offsetHeight })) } });
    }
    if (next !== "crop" && api.valueFor("imageCrop").state !== "unset") ops.push({ op: "removeProp", name: "imageCrop" });
    if (next !== "tile" && api.valueFor("imageScale").state !== "unset") ops.push({ op: "removeProp", name: "imageScale" });
    const done = await api.apply(ops, `Image → ${next.charAt(0).toUpperCase()}${next.slice(1)}`);
    // Crop starts the crop on the canvas (Figma's): drag the picture, scale it by a corner (draw/CropHandles.tsx).
    if (done && next === "crop") crop();
  };
  const crop = () => { const selection = studioStore.getState().selection; if (selection?.kind === "node") startCrop(selection.src); };
  const setScale = (value: number) => {
    const percent = Math.max(1, Math.round(value));
    void api.apply(percent === 100 ? [{ op: "removeProp", name: "imageScale" }] : [{ op: "setProp", name: "imageScale", value: { kind: "number", value: percent } }], `Tile scale → ${percent}%`);
  };

  return (
    <div className="studio-image-fill" data-prop="image-fill">
      <div className="studio-image-fill__picture">
        <PhotoControl label="Image" value={image} disabled={api.disabled} onSet={setImage} onClear={image ? remove : undefined} />
        {image && mode === "crop" ? <IconButton icon="icon-crop-line" aria-label="Crop on the canvas" appearance="flat" level="primary" size="xs" disabled={api.disabled} onClick={crop} /> : null}
        <IconButton icon="icon-upload-01-line" aria-label="Upload image" appearance="flat" level="primary" size="xs" disabled={api.disabled} onClick={() => { void upload(); }} />
        {image ? <IconButton icon="icon-minus-line" aria-label="Remove image" appearance="flat" level="primary" size="xs" disabled={api.disabled} onClick={remove} /> : null}
      </div>
      {image && fitSpec ? (
        <PropField spec={{ ...fitSpec, defaultValue: "fill" }} label="Image fit" value={fitValue} disabled={api.disabled} resettable={false} onSet={(next) => { void setFit(String(next)); }} onReset={() => { void setFit("fill"); }} />
      ) : null}
      {image && mode === "tile" ? (
        <ScrubNumberField label={<Icon name="icon-grid-01-line" size="sm" decorative />} name="Tile scale" suffix="%" min={1} max={1000} round={1} value={scaleShown} disabled={api.disabled} onCommit={setScale} />
      ) : null}
    </div>
  );
}
