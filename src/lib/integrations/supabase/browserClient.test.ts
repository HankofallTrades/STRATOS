import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseBrowserClientLoader,
  type SupabaseCreateClient,
} from "@/lib/integrations/supabase/browserClient";

describe("createSupabaseBrowserClientLoader", () => {
  it("returns null without browser config and never imports the client module", async () => {
    const importer = vi.fn();
    const loadClient = createSupabaseBrowserClientLoader(null, importer);

    await expect(loadClient()).resolves.toBeNull();
    expect(importer).not.toHaveBeenCalled();
  });

  it("imports and creates the browser client once, then reuses it", async () => {
    const createdClient = { auth: { getSession: vi.fn() } };
    const createClient = vi.fn<SupabaseCreateClient>().mockReturnValue(
      createdClient as never
    );
    const importer = vi.fn().mockResolvedValue({ createClient });
    const loadClient = createSupabaseBrowserClientLoader(
      {
        anonKey: "anon-key",
        url: "https://example.supabase.co",
      },
      importer
    );

    await expect(loadClient()).resolves.toBe(createdClient);
    await expect(loadClient()).resolves.toBe(createdClient);

    expect(importer).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key"
    );
  });
});
