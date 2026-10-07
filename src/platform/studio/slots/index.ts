/*
 * Zen Studio content slots (docs/research/studio-slots-spec-2026-10-03.md): what the inspector, the canvas, the Layers
 * panel, the canvas menu and the keyboard use. Components live in their own files (Fast Refresh), everything else in
 * plain modules.
 */

export { SlotsSection, type SlotsSectionProps } from "./SlotsSection";
export { RemoveAction, type RemoveActionProps } from "./RemoveAction";
export { SlotLayer } from "./SlotLayer";
export { SlotConfirm } from "./SlotConfirm";
export { InsertPicker, type InsertPickerProps } from "./InsertPicker";
export {
  answerSlotConfirm, canStructurallyEdit, clearSlot, duplicateKeys, duplicateSelection, duplicateShortcut, focusSlot, inPlayground, insertIntoSlot,
  isOffCanvasSelection, isSlotFile, isTemplateFile, moveAvailability, moveSelection, moveSlotLayer, openSlotPicker, removeKeys, removeSelection,
  removeShortcut, removeSlotLayer, repeatsOf, resetSlot, selectSlotLayer, slotActionsOf, slotHostContext, slotPickerRequests, structuralBlock, swapSelection, swapSlotLayer,
  useSlotConfirm, useSlotFocusRequest, useSlotRunning, useSlotServer, useStructuralBlock, type InsertRequest, type SlotActions, type SlotConfirmQuestion,
  type SlotPickerRequest, type StructuralCheck, type StructuralVerb,
} from "./actions";
export { useSlotMenuItems, type SlotMenuItems } from "./menu";
export { editDataItem, dataItemBlock, type DataItemVerb } from "./actions";
export { DATA_SLOTS, dataSlotOf, dataSlotsOf, groupRuns, itemGroup, itemTitle, slotGroups, type DataSlot } from "./dataSlots";
export {
  computedCaption, dataItemOfPart, dataItemRootOf, itemParts, renderedItems, renderedItemTitle, renderedSignature, slotGroupsAt, sourceItems, type DataItemHit, type SourceItems,
} from "./dataItems";
export { DataSlotBlock } from "./DataSlotBlock";
export { layerSlotsOf, type LayerSlotGroup } from "./layers";
export type {
  ClearSlotOp, DuplicateElementOp, DuplicateItemOp, InsertChildOp, InsertItemOp, ItemEditOp, MoveElementOp, MoveItemOp, RemoveElementOp, RemoveItemOp, ResetSlotOp,
  SlotEditApplied, SlotEditOp, SlotEditRequest, SlotEditResponse, SlotWrap,
} from "./ops";
export type { SlotAttributeForm, SlotContent, SlotElementRef, SlotExpressionForm, SlotLayer as SlotContentLayer, SlotSourceElement } from "./content";
