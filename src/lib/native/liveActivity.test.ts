import { afterEach, describe, expect, it, vi } from "vitest";

import { reportLiveActivityFailure } from "./liveActivity";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reportLiveActivityFailure", () => {
  // The bug this encodes: the plugin was not registered on the bridge, every
  // call came back UNIMPLEMENTED, and a warning buried it for a whole build
  // cycle. A dead lock screen has to read as broken, not as a phone saying no.
  it("calls an unroutable plugin an error", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    reportLiveActivityFailure("sync", { code: "UNIMPLEMENTED" });

    expect(error).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it("treats an unavailable plugin the same way", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    reportLiveActivityFailure("end", { code: "UNAVAILABLE" });

    expect(error).toHaveBeenCalledTimes(1);
  });

  // The phone refusing an activity is not the app's fault and is not worth
  // shouting about: Live Activities can simply be turned off.
  it("leaves a refused activity a warning", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    reportLiveActivityFailure("sync", new Error("activities are disabled"));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it("survives a thrown value that is not an object", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => reportLiveActivityFailure("sync", null)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
