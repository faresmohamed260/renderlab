export type CreateToolbarPopover = "queue" | "shortcuts" | null;

// An outside-close from the previous popover may arrive after opening the
// new one. It must not clear the newly selected panel.
export function nextCreateToolbarPopover(current: CreateToolbarPopover, panel: NonNullable<CreateToolbarPopover>, open: boolean): CreateToolbarPopover {
  return open ? panel : current === panel ? null : current;
}
