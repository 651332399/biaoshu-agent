import { fireEvent, screen, within } from "@testing-library/react";

/** 打开 Select / Combobox / MultiSelect 触发器并点选一项（按可见文字匹配）。 */
export function chooseOption(trigger: HTMLElement, name: string | RegExp) {
  if (trigger.getAttribute("role") === "combobox" && trigger.getAttribute("aria-haspopup") === "listbox") {
    if (trigger.getAttribute("aria-expanded") !== "true") fireEvent.click(trigger);
  } else {
    fireEvent.keyDown(trigger, { key: "Enter" });
  }
  fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name }));
}
