import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


const API_USER = { subject: "user-api", tokenIdentifier: "clerk|user-api" };
const OTHER_USER = { subject: "user-other", tokenIdentifier: "clerk|user-other" };

function makeKeyArgs(n: number) {
  const hex = n.toString(16).padStart(5, "0");
  const hash = hex.repeat(13).slice(0, 64); // 64-char hex
  return {
    name: `test-key-${n}`,
    keyPrefix: `wm_${hex}`,
    keyHash: hash,
  };
}

async function seedActiveApiKeys(
  t: ReturnType<typeof convexTest>,
  userId: string,
  count: number,
) {
  await t.run(async (ctx) => {
    const now = Date.now();
    for (let i = 1; i <= count; i++) {
      const args = makeKeyArgs(i);
      await ctx.db.insert("userApiKeys", {
        userId,
        name: args.name,
        keyPrefix: args.keyPrefix,
        keyHash: args.keyHash,
        createdAt: now - (count - i) * 1000,
      });
    }
  });
}

// ---------------------------------------------------------------------------
// createApiKey
// ---------------------------------------------------------------------------

describe("createApiKey", () => {
  test("succeeds for any signed-in user (single open tier, no entitlement gate)", async () => {
    const t = convexTest(schema, modules);

    const result = await t.withIdentity(API_USER).mutation(
      api.apiKeys.createApiKey,
      makeKeyArgs(1),
    );

    expect(result).toMatchObject({
      name: "test-key-1",
      keyPrefix: "wm_00001",
    });
    expect(result.id).toBeTruthy();
  });

  test("succeeds for a second signed-in user too (no per-plan gating)", async () => {
    const t = convexTest(schema, modules);

    const result = await t.withIdentity(OTHER_USER).mutation(
      api.apiKeys.createApiKey,
      makeKeyArgs(1),
    );
    expect(result.name).toBe("test-key-1");
  });

  test("rejects unauthenticated callers (AUTH_REQUIRED)", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.apiKeys.createApiKey, makeKeyArgs(1)),
    ).rejects.toThrow(/AUTH_REQUIRED/);
  });

  test("enforces per-user limit of 5 active keys", async () => {
    const t = convexTest(schema, modules);

    const asApiUser = t.withIdentity(API_USER);
    for (let i = 1; i <= 5; i++) {
      await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(i));
    }

    await expect(
      asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(6)),
    ).rejects.toThrow(/KEY_LIMIT_REACHED/);

    const keys = await asApiUser.query(api.apiKeys.listApiKeys, {});
    expect(keys.filter((k: any) => !k.revokedAt)).toHaveLength(5);
    expect(keys.filter((k: any) => k.revokedAt)).toHaveLength(0);
  });

  for (const overflow of [
    { seededActive: 6, nextKey: 7, revokedNames: ["test-key-1", "test-key-2"] },
    {
      seededActive: 8,
      nextKey: 9,
      revokedNames: ["test-key-1", "test-key-2", "test-key-3", "test-key-4"],
    },
  ]) {
    test(`race-leftover overflow from ${overflow.seededActive} active keys converges back to 5 active keys while creating`, async () => {
      // convex-test serializes mutations, so seed the post-race over-cap state directly.
      const t = convexTest(schema, modules);
      await seedActiveApiKeys(t, "user-api", overflow.seededActive);

      const asApiUser = t.withIdentity(API_USER);
      const created = await asApiUser.mutation(
        api.apiKeys.createApiKey,
        makeKeyArgs(overflow.nextKey),
      );
      expect(created.name).toBe(`test-key-${overflow.nextKey}`);

      const keys = await asApiUser.query(api.apiKeys.listApiKeys, {});
      const active = keys.filter((k: any) => !k.revokedAt);
      const revoked = keys.filter((k: any) => k.revokedAt);
      expect(active).toHaveLength(5);
      expect(revoked).toHaveLength(overflow.revokedNames.length);
      expect(revoked.map((k: any) => k.name).sort()).toEqual(overflow.revokedNames);
      expect(active.some((k: any) => k.name === `test-key-${overflow.nextKey}`)).toBe(true);
    });
  }

  test("revoked keys do not count toward the limit", async () => {
    const t = convexTest(schema, modules);

    const asApiUser = t.withIdentity(API_USER);
    const first = await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(1));
    for (let i = 2; i <= 5; i++) {
      await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(i));
    }

    // Revoke the first key
    await asApiUser.mutation(api.apiKeys.revokeApiKey, { keyId: first.id });

    // Should succeed since only 4 active keys remain
    const sixth = await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(6));
    expect(sixth.name).toBe("test-key-6");
  });

  test("rejects duplicate key hash", async () => {
    const t = convexTest(schema, modules);

    const asApiUser = t.withIdentity(API_USER);
    await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(1));

    await expect(
      asApiUser.mutation(api.apiKeys.createApiKey, {
        ...makeKeyArgs(1),
        name: "different-name",
      }),
    ).rejects.toThrow(/DUPLICATE_KEY/);
  });

  test("rejects invalid keyPrefix format", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.withIdentity(API_USER).mutation(api.apiKeys.createApiKey, {
        name: "test",
        keyPrefix: "wm_toolong00",
        keyHash: "a".repeat(64),
      }),
    ).rejects.toThrow(/INVALID_PREFIX/);
  });

  test("rejects invalid keyHash format", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.withIdentity(API_USER).mutation(api.apiKeys.createApiKey, {
        name: "test",
        keyPrefix: "wm_abcde",
        keyHash: "not-a-valid-hash",
      }),
    ).rejects.toThrow(/INVALID_HASH/);
  });

  test("rejects empty name", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.withIdentity(API_USER).mutation(api.apiKeys.createApiKey, {
        name: "   ",
        keyPrefix: "wm_abcde",
        keyHash: "a".repeat(64),
      }),
    ).rejects.toThrow(/INVALID_NAME/);
  });
});

// ---------------------------------------------------------------------------
// revokeApiKey
// ---------------------------------------------------------------------------

describe("revokeApiKey", () => {
  test("revokes own key and returns keyHash", async () => {
    const t = convexTest(schema, modules);

    const asApiUser = t.withIdentity(API_USER);
    const created = await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(1));

    const result = await asApiUser.mutation(api.apiKeys.revokeApiKey, { keyId: created.id });
    expect(result.ok).toBe(true);
    expect(result.keyHash).toBe(makeKeyArgs(1).keyHash);
  });

  test("rejects non-owner revoke attempt", async () => {
    const t = convexTest(schema, modules);

    const created = await t.withIdentity(API_USER).mutation(
      api.apiKeys.createApiKey,
      makeKeyArgs(1),
    );

    await expect(
      t.withIdentity(OTHER_USER).mutation(api.apiKeys.revokeApiKey, { keyId: created.id }),
    ).rejects.toThrow(/NOT_FOUND/);
  });

  test("rejects double revocation", async () => {
    const t = convexTest(schema, modules);

    const asApiUser = t.withIdentity(API_USER);
    const created = await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(1));
    await asApiUser.mutation(api.apiKeys.revokeApiKey, { keyId: created.id });

    await expect(
      asApiUser.mutation(api.apiKeys.revokeApiKey, { keyId: created.id }),
    ).rejects.toThrow(/ALREADY_REVOKED/);
  });
});

// ---------------------------------------------------------------------------
// listApiKeys
// ---------------------------------------------------------------------------

describe("listApiKeys", () => {
  test("returns empty list when no keys", async () => {
    const t = convexTest(schema, modules);

    const keys = await t.withIdentity(API_USER).query(api.apiKeys.listApiKeys, {});
    expect(keys).toEqual([]);
  });

  test("returns both active and revoked keys", async () => {
    const t = convexTest(schema, modules);

    const asApiUser = t.withIdentity(API_USER);
    const k1 = await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(1));
    await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(2));
    await asApiUser.mutation(api.apiKeys.revokeApiKey, { keyId: k1.id });

    const keys = await asApiUser.query(api.apiKeys.listApiKeys, {});
    expect(keys).toHaveLength(2);

    const active = keys.filter((k: any) => !k.revokedAt);
    const revoked = keys.filter((k: any) => k.revokedAt);
    expect(active).toHaveLength(1);
    expect(revoked).toHaveLength(1);
  });

  test("does not return other users' keys", async () => {
    const t = convexTest(schema, modules);

    await t.withIdentity(API_USER).mutation(api.apiKeys.createApiKey, makeKeyArgs(1));

    const otherKeys = await t.withIdentity(OTHER_USER).query(api.apiKeys.listApiKeys, {});
    expect(otherKeys).toEqual([]);
  });

  test("returns empty during an unauthenticated query race", async () => {
    // WORLDMONITOR-XM: the settings query can fire while Convex auth briefly
    // disappears during initial auth, sign-out, or token rotation. Seed a real
    // user's key to prove the unauthenticated result is empty rather than a
    // throw or an accidental cross-user read.
    const t = convexTest(schema, modules);
    await t.withIdentity(API_USER).mutation(api.apiKeys.createApiKey, makeKeyArgs(1));

    const keys = await t.query(api.apiKeys.listApiKeys, {});
    expect(keys).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// validateKeyByHash (internal)
// ---------------------------------------------------------------------------

describe("validateKeyByHash", () => {
  test("returns key info for valid active key", async () => {
    const t = convexTest(schema, modules);

    await t.withIdentity(API_USER).mutation(api.apiKeys.createApiKey, makeKeyArgs(1));

    const result = await t.query(internal.apiKeys.validateKeyByHash, {
      keyHash: makeKeyArgs(1).keyHash,
    });
    expect(result).toMatchObject({
      userId: "user-api",
      name: "test-key-1",
    });
  });

  test("returns null for revoked key", async () => {
    const t = convexTest(schema, modules);

    const asApiUser = t.withIdentity(API_USER);
    const created = await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(1));
    await asApiUser.mutation(api.apiKeys.revokeApiKey, { keyId: created.id });

    const result = await t.query(internal.apiKeys.validateKeyByHash, {
      keyHash: makeKeyArgs(1).keyHash,
    });
    expect(result).toBeNull();
  });

  test("returns null for nonexistent hash", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(internal.apiKeys.validateKeyByHash, {
      keyHash: "f".repeat(64),
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getKeyOwner (internal)
// ---------------------------------------------------------------------------

describe("getKeyOwner", () => {
  test("returns owner regardless of revoked status", async () => {
    const t = convexTest(schema, modules);

    const asApiUser = t.withIdentity(API_USER);
    const created = await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(1));
    await asApiUser.mutation(api.apiKeys.revokeApiKey, { keyId: created.id });

    const result = await t.query(internal.apiKeys.getKeyOwner, {
      keyHash: makeKeyArgs(1).keyHash,
    });
    expect(result).toEqual({ userId: "user-api" });
  });

  test("returns null for nonexistent hash", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(internal.apiKeys.getKeyOwner, {
      keyHash: "f".repeat(64),
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// touchKeyLastUsed (internal) — debounce
// ---------------------------------------------------------------------------

describe("touchKeyLastUsed", () => {
  test("sets lastUsedAt on first call", async () => {
    const t = convexTest(schema, modules);

    const created = await t.withIdentity(API_USER).mutation(
      api.apiKeys.createApiKey,
      makeKeyArgs(1),
    );

    await t.mutation(internal.apiKeys.touchKeyLastUsed, { keyId: created.id });

    const keys = await t.withIdentity(API_USER).query(api.apiKeys.listApiKeys, {});
    const key = keys.find((k: any) => k.id === created.id);
    expect(key?.lastUsedAt).toBeGreaterThan(0);
  });

  test("skips write for revoked key", async () => {
    const t = convexTest(schema, modules);

    const asApiUser = t.withIdentity(API_USER);
    const created = await asApiUser.mutation(api.apiKeys.createApiKey, makeKeyArgs(1));
    await asApiUser.mutation(api.apiKeys.revokeApiKey, { keyId: created.id });

    // Should not throw
    await t.mutation(internal.apiKeys.touchKeyLastUsed, { keyId: created.id });
  });
});
