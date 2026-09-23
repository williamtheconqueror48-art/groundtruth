import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");
const identity = {
  subject: "user_deleting",
  tokenIdentifier: "clerk|user_deleting",
  email: "deleting@example.com",
  emailVerified: true,
};
const states: Array<Pick<Doc<"accountDeletions">, "status" | "step">> = [
  { status: "pending", step: "personal" },
  { status: "pending", step: "external" },
  { status: "failed", step: "external" },
  { status: "complete", step: "complete" },
];

async function makeT(state: (typeof states)[number]) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("accountDeletions", {
      userId: identity.subject,
      userIdHash: "a".repeat(64),
      source: "self",
      ...state,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  return t;
}

// Object data, not a bare string: Convex's HTTP client drops string-data
// `errorData`, so the Edge would see an opaque "Server Error" it retries as a
// transient 503 (WORLDMONITOR-PD / -14D).
const rejected = async (request: Promise<unknown>) => {
  const error = await request.then(
    () => { throw new Error("expected the write fence to reject"); },
    (err: unknown) => err,
  );
  expect(JSON.parse(String((error as { data?: unknown }).data))).toEqual({
    kind: "ACCOUNT_DELETION_IN_PROGRESS",
  });
};

for (const state of states) {
  describe(`write fence with ${state.status}/${state.step}`, () => {
    test("an active session cannot recreate profile or preference data", async () => {
      const t = await makeT(state);
      const user = t.withIdentity(identity);
      expect(await user.mutation(api.users.ensureRecord, {
        localeTag: "en-US", localePrimary: "en",
      })).toEqual({ ok: false, reason: "account-deletion" });
      expect(await t.mutation(internal.users.recordTermsAcceptance, {
        userId: identity.subject, email: identity.email,
      })).toEqual({ ok: false, reason: "account-deletion" });
      await rejected(user.mutation(api.userPreferences.setPreferences, {
        variant: "full", data: {}, expectedSyncVersion: 0,
      }));
      await t.run(async (ctx) => {
        expect(await ctx.db.query("users").collect()).toEqual([]);
        expect(await ctx.db.query("userPreferences").collect()).toEqual([]);
        expect(await ctx.db.query("userPreferenceWriteRateLimits").collect()).toEqual([]);
      });
    });

    test("credentials and follow metadata cannot be recreated", async () => {
      const t = await makeT(state);
      const user = t.withIdentity(identity);
      // GROUNDTRUTH (2026-09-23 strip): the embedKeys and mcpProTokens modules
      // were deleted with the commercial subsystem, so there is no writer left
      // to fence for those tables — only their legacy rows are still asserted
      // empty below. API keys remain a live writer and stay fenced.
      const key = { name: "stale session", keyHash: "a".repeat(64), keyPrefix: "wm_abcde" };
      await rejected(user.mutation(api.apiKeys.createApiKey, key));
      await rejected(user.mutation(api.followedCountries.followCountry, { country: "US" }));
      await rejected(user.mutation(api.followedCountries.unfollowCountry, { country: "US" }));
      await rejected(user.mutation(api.followedCountries.mergeAnonymousLocal, { countries: ["US"] }));
      await t.run(async (ctx) => {
        expect(await ctx.db.query("userApiKeys").collect()).toEqual([]);
        expect(await ctx.db.query("embedKeys").collect()).toEqual([]);
        expect(await ctx.db.query("mcpProTokens").collect()).toEqual([]);
        expect(await ctx.db.query("followedCountries").collect()).toEqual([]);
        expect(await ctx.db.query("followedCountriesUserMeta").collect()).toEqual([]);
      });
    });

    test("notification sessions and delayed OAuth or Telegram callbacks stay fenced", async () => {
      const t = await makeT(state);
      const user = t.withIdentity(identity);
      const userId = identity.subject;
      await rejected(user.mutation(api.notificationChannels.setChannel, {
        channelType: "email", email: identity.email,
      }));
      await rejected(user.mutation(api.notificationChannels.createPairingToken, {}));
      await rejected(t.mutation(internal.notificationChannels.setChannelForUser, {
        userId, channelType: "email", email: identity.email,
        verifiedAccountEmail: identity.email, scheduleWelcome: false,
      }));
      await rejected(t.mutation(internal.notificationChannels.setWebPushChannelForUser, {
        userId, endpoint: "https://push.example.com/sub", p256dh: "key", auth: "auth",
      }));
      await rejected(t.mutation(internal.notificationChannels.setSlackOAuthChannelForUser, {
        userId, webhookEnvelope: "encrypted-slack",
      }));
      await rejected(t.mutation(internal.notificationChannels.setDiscordOAuthChannelForUser, {
        userId, webhookEnvelope: "encrypted-discord",
      }));
      await rejected(t.mutation(internal.notificationChannels.createPairingTokenForUser, { userId }));
      const tokenId = await t.run((ctx) => ctx.db.insert("telegramPairingTokens", {
        userId, token: "before-deletion", used: false, expiresAt: Date.now() + 60_000,
      }));
      await rejected(t.mutation(internal.notificationChannels.claimPairingToken, {
        token: "before-deletion", chatId: "12345",
      }));
      await t.run(async (ctx) => {
        expect(await ctx.db.query("notificationChannels").collect()).toEqual([]);
        expect((await ctx.db.get(tokenId))?.used).toBe(false);
        expect(await ctx.db.query("telegramPairingTokens").collect()).toHaveLength(1);
      });
    });

    test("every public and internal alert-settings writer is fenced", async () => {
      const t = await makeT(state);
      const user = t.withIdentity(identity);
      const userId = identity.subject;
      const rules = { variant: "full", enabled: true, channels: [], eventTypes: [] };
      const digest = { variant: "full", digestMode: "daily" as const };
      const quiet = { variant: "full", quietHoursEnabled: false };
      await rejected(user.mutation(api.alertRules.setAlertRules, rules));
      await rejected(user.mutation(api.alertRules.setDigestSettings, digest));
      await rejected(user.mutation(api.alertRules.setQuietHours, quiet));
      await rejected(t.mutation(internal.alertRules.setAlertRulesForUser, { ...rules, userId }));
      await rejected(t.mutation(internal.alertRules.setDigestSettingsForUser, { ...digest, userId }));
      await rejected(t.mutation(internal.alertRules.setQuietHoursForUser, { ...quiet, userId }));
      await rejected(t.mutation(internal.alertRules.setNotificationConfigForUser, { userId, variant: "full" }));
      expect(await t.run((ctx) => ctx.db.query("alertRules").collect())).toEqual([]);
    });

  });
}

test("the fence is subject-specific and permits another account's writes", async () => {
  const t = await makeT(states[0]!);
  const user = t.withIdentity({ subject: "surviving", tokenIdentifier: "clerk|surviving" });
  expect(await user.mutation(api.users.ensureRecord, {
    localeTag: "en-US", localePrimary: "en",
  })).toEqual({ ok: true, action: "inserted" });
  expect(await user.mutation(api.userPreferences.setPreferences, {
    variant: "full", data: {}, expectedSyncVersion: 0,
  })).toMatchObject({ ok: true });
  await t.mutation(internal.notificationChannels.setSlackOAuthChannelForUser, {
    userId: "surviving", webhookEnvelope: "encrypted-slack",
  });
  await t.run(async (ctx) => {
    expect(await ctx.db.query("users").collect()).toHaveLength(1);
    expect(await ctx.db.query("userPreferences").collect()).toHaveLength(1);
    expect(await ctx.db.query("notificationChannels").collect()).toHaveLength(1);
  });
});
