import type { OrderedExcalidrawElement } from "@excalidraw/element/types";

import { API } from "../tests/helpers/api";

import { getSyncableElements } from "./collaboration";

describe("getSyncableElements", () => {
  it("keeps recent tombstones and filters expired or invisibly small elements", () => {
    const now = Date.now();

    const visible = API.createElement({ type: "rectangle" });
    const invisible = API.createElement({
      type: "rectangle",
      width: 0,
      height: 0,
    });
    const recentTombstone = {
      ...API.createElement({ type: "rectangle", isDeleted: true }),
      updated: now - 1,
    };
    const expiredTombstone = {
      ...API.createElement({ type: "rectangle", isDeleted: true }),
      updated: now - 24 * 60 * 60 * 1000 - 1,
    };

    expect(
      getSyncableElements([
        visible,
        invisible,
        recentTombstone,
        expiredTombstone,
      ] as OrderedExcalidrawElement[]),
    ).toEqual([visible, recentTombstone]);
  });
});
