import { createContext, useContext } from "react";
import { gridCell, type GridCellContextValue, type LayoutCellOutput, type LayoutCellProps } from "./cell";

/** What the nearest Grid tells its children (cell.ts): its columns, whether it stacks, its breakpoint. */
export const GridCellContext = createContext<GridCellContextValue | null>(null);

/** The cell attributes for a child of the nearest Grid. */
export function useGridCell(props: LayoutCellProps): LayoutCellOutput {
  return gridCell(useContext(GridCellContext), props);
}
