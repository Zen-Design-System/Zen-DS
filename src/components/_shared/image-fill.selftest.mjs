#!/usr/bin/env node
// Image fill selftest (Studio parity F8): the CSS a Shape or frame paints a picture with (Fill, Fit, Crop, Tile), an SVG
// shape's pattern, Fill's crop, and the Figma image fill both ways (tools/studio/figma-image.mjs).
//   node src/components/_shared/image-fill.selftest.mjs   summary; exit 1 on any failure
import { coverCrop, cropOf, cssUrl, imageFillStyle, imagePattern } from "./image-fill.ts";
import { imageFillOf, imageFillProps } from "../../../tools/studio/figma-image.mjs";

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n      got      ${a}\n      expected ${e}`);
}

const src = "blob:http://x/1";
check("no picture: nothing", imageFillStyle({}), { attributes: {}, vars: {} });
check("Fill: cover, centred", imageFillStyle({ image: src }).vars, { "--zen-image-fill": 'url("blob:http://x/1")', "--zen-image-size": "cover", "--zen-image-position": "50% 50%", "--zen-image-repeat": "no-repeat" });
check("Fit: contain", imageFillStyle({ image: src, imageFit: "fit" }).vars["--zen-image-size"], "contain");
check("Crop: the right half, stretched", [imageFillStyle({ image: src, imageFit: "crop", imageCrop: { x: 50, y: 0, width: 50, height: 100 } }).vars["--zen-image-size"], imageFillStyle({ image: src, imageFit: "crop", imageCrop: { x: 50, y: 0, width: 50, height: 100 } }).vars["--zen-image-position"]], ["200% 100%", "100% 0%"]);
check("Crop without a crop: as Fill", imageFillStyle({ image: src, imageFit: "crop" }).attributes, { "data-image": "fill" });
check("Tile: its own size × scale once known, from the corner", [imageFillStyle({ image: src, imageFit: "tile", imageScale: 50 }, { width: 200, height: 100 }).vars["--zen-image-size"], imageFillStyle({ image: src, imageFit: "tile" }).vars["--zen-image-size"]], ["100px 50px", "auto"]);
check("an unknown mode is Fill", imageFillStyle({ image: src, imageFit: "stretch" }).attributes, { "data-image": "fill" });
check("a quote in a URL is escaped", cssUrl('a"b\\c'), 'url("a\\"b\\\\c")');
check("crops stay inside the picture", cropOf({ x: 90, y: -5, width: 50, height: 200 }), { x: 90, y: 0, width: 10, height: 100 });
check("Fill's crop: a wide picture in a square shows its middle", coverCrop({ width: 400, height: 200 }, { width: 100, height: 100 }), { x: 25, y: 0, width: 50, height: 100 });
check("SVG pattern: Fill slices, Fit meets", [imagePattern({}, 100, 50).picture.preserveAspectRatio, imagePattern({ imageFit: "fit" }, 100, 50).picture.preserveAspectRatio], ["xMidYMid slice", "xMidYMid meet"]);
check("SVG pattern: a crop places the whole picture so its part fills the shape", imagePattern({ imageFit: "crop", imageCrop: { x: 50, y: 0, width: 50, height: 100 } }, 100, 50).picture, { x: -100, y: -0, width: 200, height: 50, preserveAspectRatio: "none" });

// Figma, both ways.
const literal = (value) => ({ kind: "literal", value });
const element = { props: { imageCrop: { kind: "object", fields: { x: literal(10), y: literal(0), width: literal(80), height: literal(100) } } } };
check("push: Crop with its crop in fractions", imageFillOf({ image: "zen-asset:a.png", imageFit: "crop" }, element), { src: "zen-asset:a.png", scaleMode: "CROP", crop: { x: 0.1, y: 0, width: 0.8, height: 1 } });
check("push: Tile with its scale", imageFillOf({ image: "zen-asset:a.png", imageFit: "tile", imageScale: 50 }, null), { src: "zen-asset:a.png", scaleMode: "TILE", scale: 0.5 });
check("push: no picture, no fill", imageFillOf({ fill: "accent-solid" }, null), null);
const back = imageFillProps({ src: "zen-asset:a.png", scaleMode: "CROP", crop: { x: 0.1, y: 0, width: 0.8, height: 1 } }, literal);
check("pull: the same props back", back.props, { image: literal("zen-asset:a.png"), imageFit: literal("crop"), imageCrop: { kind: "object", fields: { x: literal(10), y: literal(0), width: literal(80), height: literal(100) } } });
check("pull: a picture made in Figma is named", imageFillProps({ scaleMode: "FILL" }, literal).note !== null, true);

if (failures.length) {
  console.error(`✗ image fill selftest: ${failures.length} of ${passed + failures.length} failed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ image fill selftest: ${passed} checks pass.`);
