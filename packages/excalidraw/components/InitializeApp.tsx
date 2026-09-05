import React, { useEffect, useState } from "react";

import type { Theme } from "@excalidraw/element/types";

import { resolveLanguage, setLanguage } from "../i18n";

import { LoadingMessage } from "./LoadingMessage";

import type { Language } from "../i18n";

interface Props {
  langCode: Language["code"];
  children: React.ReactElement;
  theme?: Theme;
}

export const InitializeApp = (props: Props) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      return;
    }

    let isCurrent = true;
    const updateLang = async () => {
      await setLanguage(resolveLanguage(props.langCode));
      if (isCurrent) {
        setLoading(false);
      }
    };
    updateLang();

    return () => {
      isCurrent = false;
    };
  }, [loading, props.langCode]);

  return loading ? <LoadingMessage theme={props.theme} /> : props.children;
};
