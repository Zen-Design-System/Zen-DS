// Zen-High-Contrast — the Global Colors mode for people who turn on Increase Contrast (`prefers-contrast: more`).
//
// One algorithm, two copies: this file (tokens:build writes the mode from it until Figma holds it) and the Zen Plugin
// (zen-ds-figma-plugin-main/src/plugin/code.js, which writes the mode into Figma after every Global Colors write). Keep
// them identical: everything between the BEGIN and END markers is one self-contained ES5 block, `ZenHighContrast`,
// that pastes into the plugin as it is. Its colour helpers are copies of the plugin UI's (src/ui/main.js: OKLCH,
// gamut mapping, WCAG contrast, APCA, generateAlphaScale), kept private so they never clash with code.js's own.
//
// Rules (user, 2026-10-05):
// - Step 9 (the palette's source colour) never moves. No new tokens: the text tokens on Solid fills (On-Colors,
//   On-Brights, On-Brand) keep their values, so text on a step-9 fill stays as it is.
// - Steps that only paint backgrounds keep their values: solid 1–8 (Canvas, Surface-Alt, soft Support fills) and
//   alpha 1–4 (Subtle backgrounds; alpha 3–4 also the decorative Pale and Container borders).
// - Raised to a floor, measured on the mode's Canvas and Surface (the lower contrast of the two):
//     alpha 5–7  Subtle borders (Checkbox, Radio, Subtle controls), default / hover / pressed → 3:1; hover and pressed
//                keep their original contrast step above default
//     solid 10   a colour's Light text and the Solid hover → 4.5:1, unless the palette takes black text (the On-Brand
//                APCA rule on step 9: Sky, Mint, Yellow, Zen), whose Light text is never used
//     solid 11   Base text and the Solid pressed → 4.5:1, also on the ramp's own Subtle background (alpha 3: Base
//                text sits on it); when step 10 moved, also 1.25:1 past it (COLOR_STEP_10_11_MIN_CONTRAST)
//   Neutral ramps only (their alphas are the text colours):
//     alpha 9    Placeholder (since 2026-10-05; On-White-Overlay Light shares it) → 4.5:1
//     alpha 10–11 Light and Base text → 4.5:1
//     alpha 8    Disabled text stays: WCAG leaves disabled text out, and it must stay lighter than the placeholder
//   Colour ramps: alpha 8 is unused and stays; alpha 9–12 are their solid's twin and follow it when it moved.
//   The roles are HC_BORDER_STEPS and HC_NEUTRAL_TEXT_STEPS; tokens:build warns when a semantic token moves off them.
//   A raised step also stays 1.05:1 past the step before it. Step 9 does not move, so in a light colour (Cyan, Zen…)
//   the raised borders read darker than its own solid: the ramp is no longer in order there, by design.
// - A raised colour keeps its hue and chroma and moves only in OKLCH lightness (gamut-mapped). A raised alpha is
//   solved as the colour it shows on the canvas, then decomposed back into an alpha as generateAlphaScale does.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ——— BEGIN ZenHighContrast (paste unchanged into the Zen Plugin's src/plugin/code.js) ————————————————————————
var ZenHighContrast = (function () {
  // Colour helpers: the plugin UI's own (src/ui/main.js), copied unchanged ————————————————————————————————————
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
  function srgbToLinear(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  function linearToSrgb(c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055 }
  function linearRGBToOKLab(r, g, b) { var l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b; var m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b; var s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b; var l = Math.cbrt(l_), m = Math.cbrt(m_), s = Math.cbrt(s_); return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s] }
  function okLabToLinearRGB(L, a, b) { var l = L + 0.3963377774 * a + 0.2158037573 * b; var m = L - 0.1055613458 * a - 0.0638541728 * b; var s = L - 0.0894841775 * a - 1.2914855480 * b; var l3 = l * l * l, m3 = m * m * m, s3 = s * s * s; return [4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3, -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3, -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3] }
  function oklabToOklch(L, a, b) { var C = Math.sqrt(a * a + b * b); var H = Math.atan2(b, a) * (180 / Math.PI); if (H < 0) H += 360; return { L: L, C: C, H: H } }
  function oklchToOklab(L, C, H) { var hRad = H * (Math.PI / 180); return [L, C * Math.cos(hRad), C * Math.sin(hRad)] }
  function hexToRGB(hex) { hex = hex.replace('#', ''); if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]; return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)] }
  function rgbToHex(r, g, b) { return '#' + clamp(Math.round(r), 0, 255).toString(16).padStart(2, '0') + clamp(Math.round(g), 0, 255).toString(16).padStart(2, '0') + clamp(Math.round(b), 0, 255).toString(16).padStart(2, '0') }
  function hexToOklch(hex) { var rgb = hexToRGB(hex); var lab = linearRGBToOKLab(srgbToLinear(rgb[0] / 255), srgbToLinear(rgb[1] / 255), srgbToLinear(rgb[2] / 255)); return oklabToOklch(lab[0], lab[1], lab[2]) }
  function oklchToHex(L, C, H) { var lab = oklchToOklab(L, C, H); var rgb = okLabToLinearRGB(lab[0], lab[1], lab[2]); var r = Math.round(clamp(linearToSrgb(rgb[0]), 0, 1) * 255); var g = Math.round(clamp(linearToSrgb(rgb[1]), 0, 1) * 255); var b = Math.round(clamp(linearToSrgb(rgb[2]), 0, 1) * 255); return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0') }
  function isInGamut(L, C, H) { var lab = oklchToOklab(L, C, H); var rgb = okLabToLinearRGB(lab[0], lab[1], lab[2]); var eps = 0.001; return rgb[0] >= -eps && rgb[0] <= 1 + eps && rgb[1] >= -eps && rgb[1] <= 1 + eps && rgb[2] >= -eps && rgb[2] <= 1 + eps }
  function gamutMapOklch(L, C, H) { if (isInGamut(L, C, H)) return { L: L, C: C, H: H }; var lo = 0, hi = C; for (var i = 0; i < 30; i++) { var m = (lo + hi) / 2; if (isInGamut(L, m, H)) lo = m; else hi = m } return { L: L, C: lo, H: H } }
  function relativeLuminance(hex) { var rgb = hexToRGB(hex); var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255; r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4); g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4); b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  function contrastRatioFromLuminance(hex, backgroundLuminance) { var foregroundLuminance = relativeLuminance(hex); return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05) }
  function contrastRatio(h1, h2) { return contrastRatioFromLuminance(h1, relativeLuminance(h2)) }
  function alphaToHex8(a) { var s = clamp(Math.round(a.a * 255), 0, 255).toString(16).padStart(2, '0'); return '#' + a.r.toString(16).padStart(2, '0') + a.g.toString(16).padStart(2, '0') + a.b.toString(16).padStart(2, '0') + s }
  function apcaY(hex) {
    var rgb = hexToRGB(hex);
    var rs = rgb[0] / 255, gs = rgb[1] / 255, bs = rgb[2] / 255;
    var y = 0.2126729 * Math.pow(rs, 2.4) + 0.7151522 * Math.pow(gs, 2.4) + 0.0721750 * Math.pow(bs, 2.4);
    if (y < 0.022) y = y + Math.pow(0.022 - y, 1.414);
    return y;
  }
  function apcaContrast(textHex, bgHex) {
    var Ytxt = apcaY(textHex), Ybg = apcaY(bgHex);
    var Sapc = 0;
    if (Ybg > Ytxt) {
      Sapc = (Math.pow(Ybg, 0.56) - Math.pow(Ytxt, 0.57)) * 1.14;
      if (Sapc < 0.1) return 0;
      return (Sapc - 0.027) * 100;
    } else {
      Sapc = (Math.pow(Ybg, 0.65) - Math.pow(Ytxt, 0.62)) * 1.14;
      if (Sapc > -0.1) return 0;
      return (Sapc + 0.027) * 100;
    }
  }
  function calculateOnBrandColor(bgHex) {
    var lcWhite = Math.abs(apcaContrast('#ffffff', bgHex));
    var lcBlack = Math.abs(apcaContrast('#000000', bgHex));
    return lcWhite >= lcBlack ? '#ffffff' : '#000000db';
  }
  function generateAlphaScale(solidHexes, isDark, customBg) {
    // Nếu có customBg truyền vào thì dùng, không thì fallback về mặc định
    var bg = customBg ? hexToRGB(customBg) : (isDark ? [20, 20, 20] : [255, 255, 255]);
    var out = [];

    for (var i = 0; i < 12; i++) {
      var rgb = hexToRGB(solidHexes[i]);
      var a, fr, fg, fb;

      if (!isDark) {
        var minA = 0;
        for (var k = 0; k < 3; k++) {
          var t = rgb[k], b = bg[k];
          if (t === b) continue;
          var ca = t > b ? (b === 255 ? 0 : (t - b) / (255 - b)) : (b === 0 ? 0 : (b - t) / b);
          if (ca > minA) minA = ca;
        }
        a = Math.ceil(minA * 1000) / 1000;
        a = clamp(a, 0.001, 1);
        fr = clamp(Math.round(bg[0] + (rgb[0] - bg[0]) / a), 0, 255);
        fg = clamp(Math.round(bg[1] + (rgb[1] - bg[1]) / a), 0, 255);
        fb = clamp(Math.round(bg[2] + (rgb[2] - bg[2]) / a), 0, 255);
      } else {
        // Dark alpha is a lightening overlay: its alpha comes from the channels
        // brighter than the canvas. A channel darker than the canvas (the blue
        // of dark yellows, the red of dark cyans) would need an almost opaque
        // layer, which made those alphas 96% solid and nearly invisible on
        // Surface. Such a channel stays slightly above the solid instead; only a
        // colour darker than the canvas in every channel darkens it.
        var minA = 0, darkenA = 0;
        for (var k = 0; k < 3; k++) {
          var t = rgb[k], b = bg[k];
          if (t > b) minA = Math.max(minA, (t - b) / (255 - b));
          else if (t < b) darkenA = Math.max(darkenA, (b - t) / b);
        }
        var lightening = minA > 0;
        if (!lightening) minA = darkenA;
        a = Math.ceil(minA * 1000) / 1000;
        a = clamp(a, 0.001, 0.96);
        var overlayAt = function (alpha) {
          return rgb.map(function (value, channel) {
            return clamp(Math.round((value - bg[channel] * (1 - alpha)) / alpha), 0, 255);
          });
        };
        // A channel left above the solid brightens the overlay. Lower the alpha
        // until the overlay shows the solid's contrast on the canvas (step 3
        // must still read 1.18:1), then keep the closest 8-bit result.
        if (lightening && rgb.some(function (value, channel) { return value < bg[channel] * (1 - a) - 0.5; })) {
          var canvasHex = rgbToHex(bg[0], bg[1], bg[2]);
          var solidContrast = contrastRatio(solidHexes[i], canvasHex);
          var overlayContrast = function (alpha) {
            var over = overlayAt(alpha);
            return contrastRatio(rgbToHex(over[0] * alpha + bg[0] * (1 - alpha),
              over[1] * alpha + bg[1] * (1 - alpha), over[2] * alpha + bg[2] * (1 - alpha)), canvasHex);
          };
          var maxA = a, lowA = 0.001, highA = a;
          for (var iter = 0; iter < 12; iter++) {
            var midA = (lowA + highA) / 2;
            if (overlayContrast(midA) > solidContrast) highA = midA;
            else lowA = midA;
          }
          var bestDelta = Infinity, center = Math.round(highA * 1000);
          for (var step = Math.max(1, center - 4); step <= Math.min(center + 4, Math.round(maxA * 1000)); step++) {
            var delta = Math.abs(overlayContrast(step / 1000) - solidContrast);
            if (delta < bestDelta) {
              bestDelta = delta;
              a = step / 1000;
            }
          }
        }
        var overlay = overlayAt(a);
        fr = overlay[0]; fg = overlay[1]; fb = overlay[2];
      }
      out.push({ r: fr, g: fg, b: fb, a: a });
    }
    return out;
  }

  var HC_BORDER_CONTRAST = 3;
  var HC_TEXT_CONTRAST = 4.5;
  var HC_ORDER_STEP = 1.05;
  var HC_STEP_10_11_CONTRAST = 1.25; // COLOR_STEP_10_11_MIN_CONTRAST
  var HC_BORDER_STEPS = [5, 6, 7]; // Color/Border/*/Subtle default, hover, pressed (every ramp)
  var HC_NEUTRAL_TEXT_STEPS = [9, 10, 11]; // Color/Content Placeholder, Neutral Light, Neutral Base (Neutral ramps)

  // The hex8 of an alpha step ("#RRGGBB" counts as opaque) as the colour it shows over bgHex.
  function hcComposite(hex, bgHex) {
    var h = hex.replace('#', '');
    var a = h.length === 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1;
    var fg = hexToRGB(h.substring(0, 6)), bg = hexToRGB(bgHex);
    return rgbToHex(fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a));
  }
  // The lowest contrast of a colour (alpha: composited first) against each background it can sit on.
  function hcContrast(hex, backgrounds) {
    var low = Infinity;
    for (var i = 0; i < backgrounds.length; i++) low = Math.min(low, contrastRatio(hcComposite(hex, backgrounds[i]), backgrounds[i]));
    return low;
  }
  // Move startHex in OKLCH lightness only (darker in Light, lighter in Dark) to the first colour whose `measure` reaches
  // target, keeping hue and chroma (gamut-mapped). Returns startHex when it already passes.
  function hcSolve(startHex, target, dark, measure) {
    if (measure(startHex) >= target) return startHex;
    var o = hexToOklch(startHex);
    var chroma = o.C < 0.0001 ? 0 : o.C; // a grey stays grey: its hue is rounding noise
    var lo = dark ? o.L : 0, hi = dark ? 1 : o.L, best = null;
    for (var i = 0; i < 32; i++) {
      var mid = (lo + hi) / 2;
      var m = gamutMapOklch(mid, chroma, o.H);
      var hex = oklchToHex(m.L, m.C, m.H);
      if (measure(hex) >= target) { best = hex; if (dark) hi = mid; else lo = mid; }
      else if (dark) lo = mid; else hi = mid;
    }
    return best || (dark ? '#ffffff' : '#000000');
  }
  // Upper-case hex as the Figma export writes it; an opaque alpha ("…FF") as 6 digits.
  function hcHex(hex) { var h = hex.toUpperCase(); return h.length === 9 && h.substring(7) === 'FF' ? h.substring(0, 7) : h }

  /**
   * The Zen-High-Contrast values of one ramp in one mode.
   * solids, alphas: the 12 Zen-mode values ("#RRGGBB", alphas "#RRGGBBAA"); dark: the Dark ramp; canvasHex: the canvas the
   * plugin decomposes alphas against (Light #FFFFFF, Dark: Dark Gray step 1); backgrounds: the page backgrounds text and
   * borders sit on (Light: White and Gray 2 — Surface and Canvas; Dark: Gray 1 and Gray 2); step9Light: the Light step 9,
   * which decides black text (On-Brand APCA rule); neutral: a Neutral ramp (its alphas 8–11 are the text colours).
   * Returns { solids, alphas } with every value, changed or not.
   */
  function generateHighContrastRamp(solids, alphas, dark, canvasHex, backgrounds, step9Light, neutral) {
    var hcSolids = solids.slice(), hcAlphas = alphas.slice();
    var blackText = calculateOnBrandColor(step9Light) !== '#ffffff';
    var measure = function (hex) { return hcContrast(hex, backgrounds); };
    // Base text (step 11) also sits on the ramp's Subtle background (alpha 3) over each page background.
    var onSubtle = backgrounds.concat(backgrounds.map(function (bg) { return hcComposite(alphas[2], bg); }));
    var measureBase = function (hex) { return hcContrast(hex, onSubtle); };
    // generateAlphaScale always reads 12 steps: decompose one colour by passing it 12 times.
    var alphaFor = function (shownHex) { var twelve = []; for (var k = 0; k < 12; k++) twelve.push(shownHex); return hcHex(alphaToHex8(generateAlphaScale(twelve, dark, canvasHex)[0])); };
    var alphaMeasure = function (shownHex) { return measure(alphaFor(shownHex)); };

    // Solid 10–12 (index 9–11). Step 11 and 12 only move for their floor, or to stay past a step that moved.
    if (!blackText) hcSolids[9] = hcHex(hcSolve(solids[9], Math.max(HC_TEXT_CONTRAST, measure(solids[8]) * HC_ORDER_STEP), dark, measure));
    var moved10 = hcSolids[9] !== hcHex(solids[9]);
    hcSolids[10] = hcHex(hcSolve(solids[10], HC_TEXT_CONTRAST, dark, measureBase));
    if (moved10) hcSolids[10] = hcHex(hcSolve(hcSolids[10], measure(hcSolids[9]) * HC_STEP_10_11_CONTRAST, dark, measure));
    if (hcSolids[10] !== hcHex(solids[10])) hcSolids[11] = hcHex(hcSolve(solids[11], measure(hcSolids[10]) * HC_ORDER_STEP, dark, measure));

    // Alpha 5–12 (index 4–11).
    var original = alphas.map(measure);
    var previous = original[3];
    for (var i = 4; i < 12; i++) {
      var step = i + 1, target = 0;
      // A border step after a border step keeps its original contrast step (hover, pressed); a text step after a text
      // step stays 1.05:1 past it.
      if (HC_BORDER_STEPS.indexOf(step) >= 0) target = Math.max(HC_BORDER_CONTRAST, HC_BORDER_STEPS.indexOf(step - 1) >= 0 ? previous * Math.max(HC_ORDER_STEP, original[i] / original[i - 1]) : 0);
      else if (neutral && HC_NEUTRAL_TEXT_STEPS.indexOf(step) >= 0) target = Math.max(HC_TEXT_CONTRAST, HC_NEUTRAL_TEXT_STEPS.indexOf(step - 1) >= 0 ? previous * HC_ORDER_STEP : 0);
      else if (!neutral && step >= 9 && hcSolids[i] !== hcHex(solids[i])) hcAlphas[i] = alphaFor(hcSolids[i]);
      if (target && original[i] < target) hcAlphas[i] = alphaFor(hcSolve(hcComposite(alphas[i], canvasHex), target, dark, alphaMeasure));
      previous = measure(hcAlphas[i]);
    }
    return { solids: hcSolids, alphas: hcAlphas };
  }

  // Every ramp of a Global Colors value map ({ "Light/Blue/9": "#0F73FF", … }); neutralRamps: { Gray: true } (the ramps
  // Base Colors maps Neutral to). Returns { name: Zen-High-Contrast value } for every Light/Dark solid and alpha step.
  function highContrastValues(values, neutralRamps) {
    var ramps = [], out = {}, seen = {};
    for (var name in values) {
      var match = /^Light\/([A-Za-z]+)\/9$/.exec(name);
      if (match && !seen[match[1]]) { seen[match[1]] = true; ramps.push(match[1]); }
    }
    // Page backgrounds come from the Neutral ramp (Gray when the brand uses it): Light White and step 2, Dark steps 1–2.
    // A file without that ramp falls back to Zen's own Canvas and Surface values.
    var canvasRamp = neutralRamps.Gray ? 'Gray' : (Object.keys(neutralRamps)[0] || 'Gray');
    var light2 = values['Light/' + canvasRamp + '/2'] || '#F7F7F7';
    var dark1 = values['Dark/' + canvasRamp + '/1'] || '#121212';
    var dark2 = values['Dark/' + canvasRamp + '/2'] || '#1C1C1C';
    ['Light', 'Dark'].forEach(function (mode) {
      var dark = mode === 'Dark';
      var canvasHex = dark ? dark1 : '#FFFFFF';
      var backgrounds = dark ? [dark1, dark2] : ['#FFFFFF', light2];
      ramps.forEach(function (ramp) {
        var solids = [], alphas = [];
        for (var step = 1; step <= 12; step++) {
          solids.push(values[mode + '/' + ramp + '/' + step]);
          alphas.push(values[mode + '/' + ramp + '-Alpha/' + step]);
        }
        if (solids.concat(alphas).some(function (value) { return !value; })) return;
        var hc = generateHighContrastRamp(solids, alphas, dark, canvasHex, backgrounds, values['Light/' + ramp + '/9'], !!neutralRamps[ramp]);
        for (var i = 0; i < 12; i++) {
          out[mode + '/' + ramp + '/' + (i + 1)] = hc.solids[i];
          out[mode + '/' + ramp + '-Alpha/' + (i + 1)] = hc.alphas[i];
        }
      });
    });
    return out;
  }

  return {
    MODE: 'Zen-High-Contrast',
    ROLES: { border: HC_BORDER_STEPS, neutralText: HC_NEUTRAL_TEXT_STEPS },
    FLOORS: { border: HC_BORDER_CONTRAST, text: HC_TEXT_CONTRAST },
    highContrastValues: highContrastValues,
    generateHighContrastRamp: generateHighContrastRamp,
    contrast: hcContrast,
    composite: hcComposite,
    takesBlackText: function (step9Hex) { return calculateOnBrandColor(step9Hex) !== '#ffffff'; },
    contrastRatio: contrastRatio
  };
})();
// ——— END ZenHighContrast ——————————————————————————————————————————————————————————————————————————————————————

export const HIGH_CONTRAST_MODE = ZenHighContrast.MODE;
export const HIGH_CONTRAST_ROLES = ZenHighContrast.ROLES;
export const HIGH_CONTRAST_FLOORS = ZenHighContrast.FLOORS;

/**
 * What a Zen-High-Contrast mode must hold (tokens:check, for the generated values and for Figma's once it has the mode):
 * step 9, solid 1–8 and alpha 1–4 keep their Zen values; alpha 5–7 reach 3:1; Neutral alpha 9–11 reach 4.5:1; a colour's
 * solid 10 reaches 4.5:1 unless it takes black text; solid 11 reaches 4.5:1, also on the ramp's Subtle background.
 * Returns the failures as sentences.
 */
export function verifyHighContrast(globalColors, values, neutralRamps) {
  const zen = new Map(globalColors.tokens.map((token) => [token.name, token.valuesByMode.Zen]));
  const failures = [];
  const ramps = [...new Set([...zen.keys()].map((name) => name.match(/^Light\/([A-Za-z]+)\/9$/)?.[1]).filter(Boolean))];
  const same = (a, b) => String(a).toUpperCase().replace(/^(#[0-9A-F]{6})FF$/, "$1") === String(b).toUpperCase().replace(/^(#[0-9A-F]{6})FF$/, "$1");
  for (const mode of ["Light", "Dark"]) {
    const backgrounds = mode === "Dark" ? [zen.get("Dark/Gray/1"), zen.get("Dark/Gray/2")] : ["#FFFFFF", zen.get("Light/Gray/2")];
    for (const ramp of ramps) {
      const solid = (step) => values.get(`${mode}/${ramp}/${step}`);
      const alpha = (step) => values.get(`${mode}/${ramp}-Alpha/${step}`);
      if (!solid(9) || !alpha(9)) continue;
      for (let step = 1; step <= 9; step++) if (!same(solid(step), zen.get(`${mode}/${ramp}/${step}`))) failures.push(`${mode}/${ramp}/${step} moved (${zen.get(`${mode}/${ramp}/${step}`)} → ${solid(step)}): only steps 10–12 may`);
      for (let step = 1; step <= 4; step++) if (!same(alpha(step), zen.get(`${mode}/${ramp}-Alpha/${step}`))) failures.push(`${mode}/${ramp}-Alpha/${step} moved: Subtle backgrounds keep their value`);
      const floor = (name, value, min, on = backgrounds) => { const c = ZenHighContrast.contrast(value, on); if (c < min) failures.push(`${name} ${value} reaches ${c.toFixed(2)}:1, under ${min}:1`); };
      for (const step of HIGH_CONTRAST_ROLES.border) floor(`${mode}/${ramp}-Alpha/${step}`, alpha(step), HIGH_CONTRAST_FLOORS.border);
      if (neutralRamps.has(ramp)) for (const step of HIGH_CONTRAST_ROLES.neutralText) floor(`${mode}/${ramp}-Alpha/${step}`, alpha(step), HIGH_CONTRAST_FLOORS.text);
      if (!ZenHighContrast.takesBlackText(zen.get(`Light/${ramp}/9`))) floor(`${mode}/${ramp}/10`, solid(10), HIGH_CONTRAST_FLOORS.text);
      floor(`${mode}/${ramp}/11`, solid(11), HIGH_CONTRAST_FLOORS.text, backgrounds.concat(backgrounds.map((bg) => ZenHighContrast.composite(zen.get(`${mode}/${ramp}-Alpha/3`), bg))));
    }
  }
  return failures;
}
export const generateHighContrastRamp = ZenHighContrast.generateHighContrastRamp;
export const contrastRatio = ZenHighContrast.contrastRatio;

/** The Global ramps Base Colors (Project) maps Neutral to (`Light/Neutral/1` → `{Light/Gray/1}` → Gray). */
export function neutralRampsOf(baseColors) {
  const ramps = new Set();
  for (const token of baseColors.tokens) {
    if (!/^(Light|Dark)\/Neutral(-Alpha)?\/\d+$/.test(token.name)) continue;
    for (const value of Object.values(token.valuesByMode)) {
      const ramp = String(value).match(/^\{(?:Light|Dark)\/([A-Za-z]+?)(?:-Alpha)?\/\d+\}$/)?.[1];
      if (ramp) ramps.add(ramp);
    }
  }
  return ramps;
}

/** Every ramp of a Global Colors source ({ tokens } in Figma export form, mode Zen): Map name → Zen-High-Contrast value. */
export function highContrastValues(globalColors, neutralRamps) {
  const values = Object.fromEntries(globalColors.tokens.map((token) => [token.name, token.valuesByMode.Zen]));
  return new Map(Object.entries(ZenHighContrast.highContrastValues(values, Object.fromEntries([...neutralRamps].map((ramp) => [ramp, true])))));
}

// CLI: `node scripts/high-contrast.mjs [--report]` prints what moves; scripts/build-high-contrast.mjs writes the CSS.
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  const root = path.resolve(path.dirname(self), "..");
  const source = JSON.parse(fs.readFileSync(path.join(root, "tokens/source/figma/global-colors.json"), "utf8"))["Global Colors"];
  const base = JSON.parse(fs.readFileSync(path.join(root, "tokens/source/figma/base-colors-project.json"), "utf8"))["Base Colors (Project)"];
  const values = new Map(source.tokens.map((token) => [token.name, token.valuesByMode.Zen]));
  const hc = highContrastValues(source, neutralRampsOf(base));
  const changed = [...hc].filter(([name, value]) => value.toUpperCase() !== String(values.get(name)).toUpperCase());
  console.log(`Zen-High-Contrast: ${changed.length} of ${hc.size} values change`);
  if (process.argv.includes("--report")) for (const [name, value] of changed) console.log(`  ${name.padEnd(26)} ${values.get(name)} → ${value}`);
}
