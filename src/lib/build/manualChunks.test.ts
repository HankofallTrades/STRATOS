import { describe, expect, it } from "vitest";

import { getManualChunkName } from "@/lib/build/manualChunks";

describe("getManualChunkName", () => {
  it("keeps React Query separate from protected Redux persistence", () => {
    expect(
      getManualChunkName("/repo/node_modules/@tanstack/react-query/build/index.js")
    ).toBe("query");
    expect(
      getManualChunkName("/repo/node_modules/redux-persist/es/index.js")
    ).toBe("state");
  });
});
