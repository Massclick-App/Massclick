import { fireEvent, render, screen } from "@testing-library/react";
import QuickLinksMenu from "./QuickLinksMenu";

test("renders quick links on demand and preserves menu interactions", () => {
  const trigger = document.createElement("button");
  document.body.appendChild(trigger);
  trigger.focus();

  const triggerRef = { current: trigger };
  const onClose = jest.fn();
  const onSelect = jest.fn();

  const { unmount } = render(
    <QuickLinksMenu
      items={[{ name: "Leads", icon: <span aria-hidden="true">L</span> }]}
      onClose={onClose}
      onSelect={onSelect}
      triggerRef={triggerRef}
    />,
  );

  const item = screen.getByRole("menuitem", { name: "Leads" });
  expect(item).toHaveFocus();

  fireEvent.click(item);
  expect(onSelect).toHaveBeenCalledWith("Leads");

  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);

  unmount();
  expect(trigger).toHaveFocus();
  trigger.remove();
});
