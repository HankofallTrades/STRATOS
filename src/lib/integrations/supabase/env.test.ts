import { describe, expect, it } from "vitest";

import { readSupabaseBrowserConfig } from "@/lib/integrations/supabase/env";

describe("readSupabaseBrowserConfig", () => {
  it("returns null when either browser env var is missing", () => {
    expect(readSupabaseBrowserConfig({})).toBeNull();
    expect(
      readSupabaseBrowserConfig({
        VITE_SUPABASE_URL: "https://example.supabase.co",
      })
    ).toBeNull();
    expect(
      readSupabaseBrowserConfig({
        VITE_SUPABASE_ANON_KEY: "anon-key",
      })
    ).toBeNull();
  });

  it("returns the trimmed config when both env vars are present", () => {
    expect(
      readSupabaseBrowserConfig({
        VITE_SUPABASE_URL: " https://example.supabase.co ",
        VITE_SUPABASE_ANON_KEY: " anon-key ",
      })
    ).toEqual({
      anonKey: "anon-key",
      url: "https://example.supabase.co",
    });
  });
});
