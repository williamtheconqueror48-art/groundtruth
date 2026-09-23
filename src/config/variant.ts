/**
 * GROUNDTRUTH (2026-09-23 strip): single app. The variant system was removed —
 * SITE_VARIANT is always 'full'. The list/type below are kept only because
 * Tier-2 variant panel catalogs still iterate them; they will be collapsed
 * in the Tier 2 strip.
 */
export const SITE_VARIANTS = ['full', 'tech', 'finance', 'happy', 'commodity', 'energy'] as const;

export type SiteVariant = (typeof SITE_VARIANTS)[number];

export function isSiteVariant(value: string | null | undefined): value is SiteVariant {
  return typeof value === 'string' && (SITE_VARIANTS as readonly string[]).includes(value);
}

/** @deprecated Single-app build: always 'full'. */
export const SITE_VARIANT: string = 'full';
