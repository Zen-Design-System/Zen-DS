/**
 * Layer blend mode (Figma's Appearance › blend, Zen Studio's ◐): `blendMode` on Box, Stack, Grid and Shape draws with the
 * same CSS `mix-blend-mode`; a frame's default is Pass through (nothing set), Normal on a frame keeps its layers' blending
 * inside it (`isolation: isolate`).
 */
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Box, Grid, Shape, Stack, ZenProvider } from "../../src/index";

describe("blendMode", () => {
  it("draws frames and shapes with mix-blend-mode", async () => {
    const screen = await render(
      <ZenProvider>
        <Box blendMode="multiply" width={40} height={40} data-testid="box" />
        <Stack blendMode="screen" data-testid="stack"><span>a</span></Stack>
        <Grid blendMode="color-dodge" data-testid="grid"><span>a</span></Grid>
        <Box group blendMode="luminosity" width={40} height={40} data-testid="group">
          <Shape type="ellipse" blendMode="overlay" width={20} height={20} data-testid="shape" />
        </Box>
      </ZenProvider>,
    );
    const blend = (id: string) => getComputedStyle(screen.getByTestId(id).element()).mixBlendMode;
    expect(blend("box")).toBe("multiply");
    expect(blend("stack")).toBe("screen");
    expect(blend("grid")).toBe("color-dodge");
    expect(blend("group")).toBe("luminosity");
    expect(blend("shape")).toBe("overlay");
    expect(getComputedStyle(screen.getByTestId("box").element()).isolation).toBe("auto");
  });

  it("leaves the default unset and isolates a frame's Normal", async () => {
    const screen = await render(
      <ZenProvider>
        <Box width={40} height={40} data-testid="plain" />
        <Box blendMode="pass-through" width={40} height={40} data-testid="pass" />
        <Box blendMode="normal" width={40} height={40} data-testid="normal" />
        <Shape type="rectangle" blendMode="normal" width={20} height={20} data-testid="shape" />
      </ZenProvider>,
    );
    const style = (id: string) => getComputedStyle(screen.getByTestId(id).element());
    for (const id of ["plain", "pass"]) {
      expect(screen.getByTestId(id).element().hasAttribute("data-blend"), id).toBe(false);
      expect(style(id).mixBlendMode, id).toBe("normal");
      expect(style(id).isolation, id).toBe("auto");
    }
    expect(style("normal").mixBlendMode).toBe("normal");
    expect(style("normal").isolation).toBe("isolate");
    expect(style("shape").mixBlendMode).toBe("normal");
  });
});
