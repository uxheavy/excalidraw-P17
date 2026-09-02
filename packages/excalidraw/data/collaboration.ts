import { isInvisiblySmallElement } from "@excalidraw/element";

import type { MakeBrand } from "@excalidraw/common/utility-types";
import type { OrderedExcalidrawElement } from "@excalidraw/element/types";

const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000;

export type SyncableExcalidrawElement = OrderedExcalidrawElement &
  MakeBrand<"SyncableExcalidrawElement">;

export const isSyncableElement = (
  element: OrderedExcalidrawElement,
): element is SyncableExcalidrawElement => {
  if (element.isDeleted) {
    return element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT;
  }
  return !isInvisiblySmallElement(element);
};

export const getSyncableElements = (
  elements: readonly OrderedExcalidrawElement[],
) => elements.filter(isSyncableElement);
