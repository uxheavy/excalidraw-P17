import { useState, useLayoutEffect } from "react";

import { THEME } from "@excalidraw/common";

import { useEditorInterface, useExcalidrawContainer } from "../components/App";
import { useUIAppState } from "../context/ui-appState";
import { getLanguage } from "../i18n";

export const useCreatePortalContainer = (opts?: {
  className?: string;
  parentSelector?: string;
}) => {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);

  const editorInterface = useEditorInterface();
  const { theme } = useUIAppState();
  const language = getLanguage();

  const { container: excalidrawContainer } = useExcalidrawContainer();

  useLayoutEffect(() => {
    if (div) {
      div.className = "";
      div.classList.add("excalidraw", ...(opts?.className?.split(/\s+/) || []));
      div.lang = language.code;
      div.dir = language.rtl ? "rtl" : "ltr";
      div.classList.toggle(
        "excalidraw--mobile",
        editorInterface.formFactor === "phone",
      );
      div.classList.toggle("theme--dark", theme === THEME.DARK);
    }
  }, [div, language, theme, editorInterface.formFactor, opts?.className]);

  useLayoutEffect(() => {
    const ownerDocument = excalidrawContainer?.ownerDocument;
    const container = opts?.parentSelector
      ? excalidrawContainer?.querySelector(opts.parentSelector)
      : ownerDocument?.body;

    if (!container || !ownerDocument) {
      return;
    }

    const div = ownerDocument.createElement("div");

    container.appendChild(div);

    setDiv(div);

    return () => {
      container.removeChild(div);
    };
  }, [excalidrawContainer, opts?.parentSelector]);

  return div;
};
