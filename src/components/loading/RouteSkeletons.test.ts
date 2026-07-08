import { describe, expect, it } from "vitest";

import { getRouteSkeletonKind } from "@/components/loading/routeSkeletonKinds";

describe("getRouteSkeletonKind", () => {
  it("maps routes to skeletons that match the destination page shape", () => {
    expect(getRouteSkeletonKind("/login")).toBe("login");
    expect(getRouteSkeletonKind("/")).toBe("home");
    expect(getRouteSkeletonKind("/workout")).toBe("workout");
    expect(getRouteSkeletonKind("/analytics")).toBe("analytics");
    expect(getRouteSkeletonKind("/profile")).toBe("profile");
    expect(getRouteSkeletonKind("/profile/settings")).toBe("settings");
    expect(getRouteSkeletonKind("/not-real")).toBe("generic");
  });
});
