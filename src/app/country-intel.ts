/**
 * GROUNDTRUTH (2026-09-23 strip): AI-generated country briefs were removed.
 *
 * This module is a no-op compatibility shim. The full CountryIntelManager
 * (brief pages, story views, signal aggregation for LLM briefs) was deleted
 * with the AI-brief removal. Call sites that opened briefs now resolve
 * silently; country-name helpers remain functional.
 */
import { TIER1_COUNTRIES } from '@/config/countries';

export class CountryIntelManager {
  constructor(_state?: unknown) {}

  /** Retained: resolve a display name for an ISO country code. */
  static resolveCountryName(code: string): string {
    if (TIER1_COUNTRIES[code]) return TIER1_COUNTRIES[code];
    try {
      const displayNamesCtor = (Intl as unknown as { DisplayNames?: new (locales: string[], opts: { type: string }) => { of(c: string): string | undefined } }).DisplayNames;
      if (!displayNamesCtor) return code;
      const displayNames = new displayNamesCtor(['en'], { type: 'region' });
      const resolved = displayNames.of(code);
      if (resolved && resolved.toUpperCase() !== code) return resolved;
    } catch {
      // Intl.DisplayNames unavailable in older runtimes.
    }
    return code;
  }

  /** Retained: flag emoji for an ISO country code. */
  static toFlagEmoji(code: string): string {
    try {
      return code
        .toUpperCase()
        .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
    } catch {
      return '';
    }
  }

  // --- Removed brief/story surface: no-op shims ---------------------------

  async init(): Promise<void> {}

  destroy(): void {}

  refreshOpenBrief(): void {}

  refreshOpenMilitaryActivity(): void {}

  refreshOpenTimeline(): void {}

  async openCountryStory(_code: string, _name: string): Promise<void> {
    console.warn('[CountryIntel] Country stories were removed in the GROUNDTRUTH strip.');
  }

  async openCountryBriefByCode(_code: string, _name: string, _opts?: unknown): Promise<void> {
    console.warn('[CountryIntel] AI country briefs were removed in the GROUNDTRUTH strip.');
  }
}
