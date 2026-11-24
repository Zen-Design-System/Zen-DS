import { useEffect, useState } from "react";
import { imageFillMode, imageFillStyle, knownPictureSize, pictureSizeProbe, shownPicture, type ImageFillMode, type ImageFillProps, type PictureSize } from "./image-fill";

/** A picture's own size once it has loaded (only when `wanted`: Tile needs it), else null. */
export function usePictureSize(src: string | undefined, wanted: boolean): PictureSize | null {
  const [, loaded] = useState(0);
  useEffect(() => {
    if (!src || !wanted) return undefined;
    return pictureSizeProbe(src, () => loaded((count) => count + 1));
  }, [src, wanted]);
  return src && wanted ? knownPictureSize(src) : null;
}

/** The image fill of a layer (image-fill.ts): `imageFillStyle` with the tiled picture's own size read when Tile needs it. */
export function useImageFill(props: ImageFillProps): { attributes: Record<`data-${string}`, string | undefined>; vars: Record<`--${string}`, string | undefined>; mode: ImageFillMode | null; picture: PictureSize | null } {
  const shown = shownPicture(props.image);
  const picture = usePictureSize(shown, Boolean(shown) && imageFillMode(props.imageFit) === "tile");
  const { attributes, vars } = imageFillStyle(props, picture);
  return { attributes, vars, mode: (attributes["data-image"] as ImageFillMode | undefined) ?? null, picture };
}
