import clsx from "clsx";
import { useEffect, useState } from "react";

import { getShortcutKey } from "../shortcut";

import { IconButton } from "./IconButton";
import DropdownMenu from "./dropdownMenu/DropdownMenu";

import type {
  EditorShortcut,
  HostToolbarButton,
  HostToolbarItem,
} from "../types";

const shortcutMatches = (shortcut: EditorShortcut, event: KeyboardEvent) =>
  event.key.toLowerCase() === shortcut.key.toLowerCase() &&
  event.shiftKey === Boolean(shortcut.shiftKey) &&
  event.altKey === Boolean(shortcut.altKey) &&
  (shortcut.ctrlOrCmd
    ? event.ctrlKey || event.metaKey
    : !event.ctrlKey && !event.metaKey);

const getShortcutLabel = (shortcut: EditorShortcut) => {
  const modifiers = [
    shortcut.ctrlOrCmd ? getShortcutKey("CtrlOrCmd") : null,
    shortcut.altKey ? getShortcutKey("Alt") : null,
    shortcut.shiftKey ? getShortcutKey("Shift") : null,
  ].filter(Boolean);
  return [...modifiers, shortcut.key.toUpperCase()].join("+");
};

export const getHostToolbarShortcuts = (
  item: HostToolbarItem | HostToolbarButton,
): readonly EditorShortcut[] => {
  if ("type" in item && item.type === "menu") {
    return item.items.flatMap((child) => child.shortcuts ?? []);
  }
  return item.shortcuts ?? [];
};

export const findHostToolbarItemByShortcut = (
  items: readonly HostToolbarItem[] | undefined,
  event: KeyboardEvent,
): HostToolbarButton | null => {
  for (const item of items ?? []) {
    if ("type" in item && item.type === "menu") {
      const child = item.items.find(
        (candidate) =>
          !candidate.disabled &&
          (candidate.shortcuts ?? []).some((shortcut) =>
            shortcutMatches(shortcut, event),
          ),
      );
      if (child) return child;
      continue;
    }
    if (
      !item.disabled &&
      (item.shortcuts ?? []).some((shortcut) =>
        shortcutMatches(shortcut, event),
      )
    ) {
      return item;
    }
  }
  return null;
};

const HostToolbarMenu = ({
  item,
}: {
  item: Extract<HostToolbarItem, { type: "menu" }>;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open}>
      <DropdownMenu.Trigger
        aria-label={item.label}
        title={item.label}
        disabled={item.disabled}
        className={clsx({ "App-toolbar__extra-tools-trigger--selected": open })}
        onToggle={() => setOpen((value) => !value)}
      >
        {item.icon}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        onClickOutside={() => setOpen(false)}
        onSelect={() => setOpen(false)}
      >
        {item.items.map((child) => (
          <DropdownMenu.Item
            key={child.id}
            icon={child.icon}
            shortcut={child.shortcuts?.map(getShortcutLabel).join(" ")}
            aria-label={child.label}
            selected={child.checked}
            disabled={child.disabled}
            onSelect={() => child.onSelect()}
          >
            {child.label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};

const HostToolbarButtonView = ({ item }: { item: HostToolbarButton }) => {
  const shared = {
    icon: item.icon,
    keyBindingLabel: item.shortcuts?.[0]?.key.toUpperCase(),
    "aria-label": item.label,
    "aria-keyshortcuts": item.shortcuts?.map(getShortcutLabel).join(", "),
    title: item.shortcuts?.length
      ? `${item.label} — ${item.shortcuts.map(getShortcutLabel).join(" or ")}`
      : item.label,
    disabled: item.disabled,
    className: "host-toolbar-item",
    "data-testid": `host-toolbar-${item.id}`,
  };

  return item.checked === undefined ? (
    <IconButton type="button" {...shared} onClick={() => item.onSelect()} />
  ) : (
    <IconButton
      type="toggle"
      checked={item.checked}
      {...shared}
      onSelect={() => item.onSelect()}
    />
  );
};

export const HostToolbar = ({
  items,
}: {
  items?: readonly HostToolbarItem[];
}) => (
  <>
    {(items ?? []).map((item) =>
      "type" in item && item.type === "menu" ? (
        <HostToolbarMenu key={item.id} item={item} />
      ) : (
        <HostToolbarButtonView key={item.id} item={item} />
      ),
    )}
  </>
);
