import { isDarwin } from "@excalidraw/common";

import { t } from "./i18n";

import type { EditorShortcut } from "./types";

export const getShortcutKey = (shortcut: string): string =>
  shortcut
    .replace(
      /\b(Opt(?:ion)?|Alt)\b/i,
      isDarwin ? t("keys.option") : t("keys.alt"),
    )
    .replace(/\bShift\b/i, t("keys.shift"))
    .replace(/\b(Enter|Return)\b/i, t("keys.enter"))
    .replace(
      /\b(Ctrl|Cmd|Command|CtrlOrCmd)\b/gi,
      isDarwin ? t("keys.cmd") : t("keys.ctrl"),
    )
    .replace(/\b(Esc(?:ape)?)\b/i, t("keys.escape"))
    .replace(/\b(Space(?:bar)?)\b/i, t("keys.spacebar"))
    .replace(/\b(Del(?:ete)?)\b/i, t("keys.delete"));

type ShortcutKeyboardEvent = Pick<
  KeyboardEvent,
  "key" | "shiftKey" | "altKey" | "ctrlKey" | "metaKey"
>;

export const shortcutMatches = (
  shortcut: EditorShortcut,
  event: ShortcutKeyboardEvent,
) =>
  event.key.toLowerCase() === shortcut.key.toLowerCase() &&
  event.shiftKey === Boolean(shortcut.shiftKey) &&
  event.altKey === Boolean(shortcut.altKey) &&
  (shortcut.ctrlOrCmd
    ? event.ctrlKey || event.metaKey
    : !event.ctrlKey && !event.metaKey);

export const getShortcutLabel = (shortcut: EditorShortcut) => {
  const modifiers = [
    shortcut.ctrlOrCmd ? getShortcutKey("CtrlOrCmd") : null,
    shortcut.altKey ? getShortcutKey("Alt") : null,
    shortcut.shiftKey ? getShortcutKey("Shift") : null,
  ].filter(Boolean);
  return [...modifiers, shortcut.key.toUpperCase()].join("+");
};
