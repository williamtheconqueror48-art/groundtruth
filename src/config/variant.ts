/**
 * GROUNDTRUTH (2026-09-23 strip): single app. The variant system was removed —
 * SITE_VARIANT is always 'full'. SITE_VARIANTS is retained as a single-element
 * list so the webmcp catalog builders (which iterate variants) keep working
 * unchanged; they now produce single-variant catalogs.
 */
export const SITE_VARIANTS = ['full'] as const;

export type SiteVariant = (typeof SITE_VARIANTS)[number];

export function isSiteVariant(value: string | null | undefined): value is SiteVariant {
  return value === 'full';
}

/** Single-app build: always 'full'. */
export const SITE_VARIANT: SiteVariant = 'full';
