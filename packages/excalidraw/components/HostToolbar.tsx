import clsx from "clsx";
import { useEffect, useState } from "react";

import {
  getAriaShortcutLabels,
  getShortcutLabel,
  shortcutMatches,
} from "../shortcut";

import { getToolShortcuts, TOOLS } from "./Tools";
import { IconButton } from "./IconButton";
import DropdownMenu from "./dropdownMenu/DropdownMenu";

import type {
  EditorShortcut,
  HostToolbarButton,
  HostToolbarItem,
  HostToolbarMenuDescriptor,
  ToolShortcutOverrides,
} from "../types";

export const isHostToolbarMenu = (
  item: HostToolbarItem,
): item is HostToolbarMenuDescriptor => "items" in item;

const shortcutId = (shortcut: EditorShortcut) =>
  `${shortcut.ctrlOrCmd ? "ctrl-or-cmd:" : ""}${shortcut.altKey ? "alt:" : ""}${
    shortcut.shiftKey ? "shift:" : ""
  }${shortcut.key.toLowerCase()}`;

export const getHostToolbarShortcuts = (
  item: HostToolbarItem | HostToolbarButton,
): readonly EditorShortcut[] => {
  if (isHostToolbarMenu(item)) {
    return item.items.flatMap((child) => child.shortcuts ?? []);
  }
  return item.shortcuts ?? [];
};

export const findHostToolbarItemByShortcut = (
  items: readonly HostToolbarItem[] | undefined,
  event: KeyboardEvent,
): HostToolbarButton | null => {
  for (const item of items ?? []) {
    if (isHostToolbarMenu(item)) {
      const child = item.items.find(
        (candidate) =>
          !item.disabled &&
          !candidate.disabled &&
          (candidate.shortcuts ?? []).some((shortcut) =>
            shortcutMatches(shortcut, event),
          ),
      );
      if (child) {
        return child;
      }
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

export const findActiveHostToolbarItem = (
  items: readonly HostToolbarItem[] | undefined,
): HostToolbarButton | null => {
  for (const item of items ?? []) {
    if (isHostToolbarMenu(item)) {
      const child = item.items.find(
        (candidate) => candidate.checked && candidate.onCancel,
      );
      if (child) {
        return child;
      }
    } else if (item.checked && item.onCancel) {
      return item;
    }
  }
  return null;
};

export const getHostToolbarShortcutCollisions = (
  items: readonly HostToolbarItem[] | undefined,
  overrides?: ToolShortcutOverrides,
) => {
  const owners = new Map<string, string[]>();
  const add = (shortcut: EditorShortcut, owner: string) => {
    const id = shortcutId(shortcut);
    owners.set(id, [...(owners.get(id) ?? []), owner]);
  };

  for (const type of Object.keys(TOOLS) as (keyof typeof TOOLS)[]) {
    getToolShortcuts(type, overrides).forEach((shortcut) =>
      add(shortcut, `tool:${type}`),
    );
  }
  for (const item of items ?? []) {
    const buttons = isHostToolbarMenu(item) ? item.items : [item];
    buttons.forEach((button) =>
      (button.shortcuts ?? []).forEach((shortcut) =>
        add(shortcut, `host:${button.id}`),
      ),
    );
  }

  return [...owners.entries()]
    .filter(([, shortcutsOwners]) => shortcutsOwners.length > 1)
    .map(
      ([shortcut, shortcutOwners]) =>
        `${shortcut} (${shortcutOwners.join(", ")})`,
    );
};

const HostToolbarMenuView = ({ item }: { item: HostToolbarMenuDescriptor }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (item.disabled) {
      setOpen(false);
    }
  }, [item.disabled]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        aria-label={item.label}
        title={item.label}
        disabled={item.disabled}
        className={clsx({ "App-toolbar__extra-tools-trigger--selected": open })}
      >
        {item.icon ?? item.label}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {item.items.map((child) => (
          <DropdownMenu.Item
            key={child.id}
            icon={child.icon}
            shortcut={child.shortcuts?.map(getShortcutLabel).join(" ")}
            aria-label={child.label}
            aria-keyshortcuts={child.shortcuts
              ?.flatMap(getAriaShortcutLabels)
              .join(" ")}
            selected={child.checked}
            aria-pressed={child.checked}
            disabled={item.disabled || child.disabled}
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
    label: item.label,
    keyBindingLabel: item.shortcuts?.[0]
      ? getShortcutLabel(item.shortcuts[0])
      : undefined,
    "aria-label": item.label,
    "aria-keyshortcuts": item.shortcuts
      ?.flatMap(getAriaShortcutLabels)
      .join(" "),
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
  toolShortcutOverrides,
}: {
  items?: readonly HostToolbarItem[];
  toolShortcutOverrides?: ToolShortcutOverrides;
}) => {
  const collisions = getHostToolbarShortcutCollisions(
    items,
    toolShortcutOverrides,
  );
  if (process.env.NODE_ENV !== "production" && collisions.length) {
    throw new Error(`Duplicate Excalidraw shortcuts: ${collisions.join("; ")}`);
  }

  return (
    <>
      {(items ?? []).map((item) =>
        isHostToolbarMenu(item) ? (
          <HostToolbarMenuView key={item.id} item={item} />
        ) : (
          <HostToolbarButtonView key={item.id} item={item} />
        ),
      )}
    </>
  );
};
