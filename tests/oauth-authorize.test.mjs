/**
 * Tests for the OAuth consent page HTML render (single open tier).
 *
 * GROUNDTRUTH (2026-09-23 strip): the "Sign in with WorldMonitor Pro" CTA
 * and the /mcp-grant bridge are gone. The API-key form is the primary path
 * and renders visible. The handler logic (POST dispatch, nonce mint, redis
 * ops, validateApiKey) is exercised by the existing OAuth integration tests;
 * here we only assert the HTML invariants of `consentPage(...)`.
 *
 * `consentPage` is exported from api/oauth/authorize.js solely for these
 * tests.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { consentPage } from '../api/oauth/authorize.js';

const BASE_PARAMS = {
  client_name: 'Claude Desktop',
  redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
  client_id: 'client_abc',
  response_type: 'code',
  code_challenge: 'a'.repeat(43),
  code_challenge_method: 'S256',
  state: '',
};

const NONCE = 'nonce_xyz_12345';

async function renderHtml(params, nonce, errorMsg) {
  const res = consentPage(params, nonce, errorMsg);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  return await res.text();
}

describe('consentPage — single open tier (no Pro CTA)', () => {
  it('has NO Pro CTA and NO /mcp-grant links anywhere', async () => {
    const html = await renderHtml(BASE_PARAMS, NONCE);
    assert.doesNotMatch(html, /pro-cta/);
    assert.doesNotMatch(html, /mcp-grant/);
    assert.doesNotMatch(html, /Sign in with WorldMonitor Pro/);
  });

  it('API-key form renders VISIBLE by default (no display:none)', async () => {
    const html = await renderHtml(BASE_PARAMS, NONCE);
    assert.match(html, /<form id="cf"[^>]*method="POST" action="https:\/\/api\.worldmonitor\.app\/oauth\/authorize"/);
    assert.doesNotMatch(html, /<form id="cf"[^>]*display:none/);
    assert.match(html, /<input type="password" id="api_key"/);
  });

  it('inline script still wires #api-key fragment + errorMsg auto-show + XHR submit', async () => {
    const html = await renderHtml(BASE_PARAMS, NONCE);
    // Single-IIFE inline script (no external assets — edge runtime constraint).
    assert.match(html, /<script>\(function\(\)\{/);
    assert.match(html, /window\.location\.hash==='#api-key'/);
    assert.match(html, /em\.textContent\.length>0/);
    assert.match(html, /'\/oauth\/authorize'/);
    assert.match(html, /'invalid_key'/);
  });
});

describe('consentPage — error-state form-visible behaviour (U4)', () => {
  it('errorMsg present: the <p class="error"> renders WITHOUT inline display:none — script then auto-reveals form', async () => {
    const html = await renderHtml(BASE_PARAMS, NONCE, 'Invalid API key. Please check and try again.');
    // Default state: error <p> is hidden via inline style. Error state: the
    // attribute is omitted. The inline script reads textContent to decide
    // whether to call showForm() — so the form pops open without a server
    // round-trip when the user retries.
    assert.match(html, /<p class="error" id="ke">Invalid API key/);
    assert.doesNotMatch(html, /<p class="error" id="ke" style="display:none">Invalid API key/);
  });

  it('errorMsg empty (default render): the <p class="error"> has inline display:none and is empty', async () => {
    const html = await renderHtml(BASE_PARAMS, NONCE);
    assert.match(html, /<p class="error" id="ke" style="display:none"><\/p>/);
  });

  it('errorMsg HTML-escapes — XSS defense (same escapeHtml as the rest of the page)', async () => {
    const html = await renderHtml(BASE_PARAMS, NONCE, '<script>alert(1)</script>');
    assert.doesNotMatch(html, /<p class="error" id="ke"><script>alert\(1\)<\/script>/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  });
});

describe('consentPage — XSS defense for client metadata (U4)', () => {
  it('escapes client_name in the consent header (XSS defense)', async () => {
    // redirect_uri is allowlisted upstream (handler's `uris.includes(...)`
    // gate at lines 202+283), so a malformed-URI redirect_uri never reaches
    // consentPage in production. The realistic XSS vector is client_name —
    // anything in the registered client metadata flows into the page.
    const evilParams = {
      ...BASE_PARAMS,
      client_name: '"><script>alert(1)</script>',
    };
    const html = await renderHtml(evilParams, NONCE);
    // Raw injection must not appear anywhere.
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    // Escaped form must appear in the client-name area.
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    // No grant URLs exist anymore — a malicious client_name has no
    // grant/redirect href to influence.
    assert.doesNotMatch(html, /mcp-grant/);
  });

  it('rejects (via URL constructor) a redirect_uri that fails to parse — production handler allowlists URIs upstream, so consentPage assumes parseable input', async () => {
    // Codifying the contract: consentPage's `new URL(redirect_uri)` is the
    // last line of defense AFTER the handler's `uris.includes(...)` gate.
    // If a future refactor removes the upstream allowlist, this fail-fast
    // throw is the right behaviour (better than producing a malformed page).
    assert.throws(
      () => consentPage({ ...BASE_PARAMS, redirect_uri: 'not-a-url' }, NONCE),
      /Invalid URL/,
    );
  });

  it('"Unknown Client" fallback still renders the visible API-key form', async () => {
    const html = await renderHtml({ ...BASE_PARAMS, client_name: 'Unknown Client' }, NONCE);
    assert.match(html, /<div class="client-name">Unknown Client wants access<\/div>/);
    assert.match(html, /<form id="cf"/);
    assert.doesNotMatch(html, /mcp-grant/);
  });
});

describe('consentPage — preserved invariants (regression guard for U6+)', () => {
  it('CSRF nonce is escaped into the hidden _nonce input', async () => {
    const html = await renderHtml(BASE_PARAMS, NONCE);
    assert.match(html, new RegExp(`<input type="hidden" name="_nonce" id="nn" value="${NONCE}">`));
  });

  it('CSRF nonce is HTML-escaped (defense against any future non-UUID nonce mint)', async () => {
    const html = await renderHtml(BASE_PARAMS, '"><x>');
    // Hidden input value must be escaped; raw injection must not appear.
    assert.doesNotMatch(html, /value=""><x>"/);
    assert.match(html, /value="&quot;&gt;&lt;x&gt;"/);
  });

  it('client_name and redirect host appear in the client-hd block', async () => {
    const html = await renderHtml(BASE_PARAMS, NONCE);
    assert.match(html, /<div class="client-name">Claude Desktop wants access<\/div>/);
    assert.match(html, /<div class="client-host">via claude\.ai<\/div>/);
  });

  it('a custom-scheme redirect shows its scheme, not a bare pseudo-host (cursor:// deeplink)', async () => {
    const html = await renderHtml({ ...BASE_PARAMS, redirect_uri: 'cursor://anysphere.cursor-mcp/oauth/callback' }, NONCE);
    assert.match(html, /<div class="client-host">via cursor:\/\/anysphere\.cursor-mcp<\/div>/);
  });

  it('all five scope bullets are still listed (anti-phishing — user sees what they grant)', async () => {
    const html = await renderHtml(BASE_PARAMS, NONCE);
    assert.match(html, /Real-time news/);
    assert.match(html, /flight tracking/);
    assert.match(html, /Weather alerts/);
    assert.match(html, /Geopolitical risk/);
    assert.match(html, /stocks, commodities/);
  });

  it('legacy "Get an API key" footer link is preserved', async () => {
    const html = await renderHtml(BASE_PARAMS, NONCE);
    assert.match(html, /href="https:\/\/www\.worldmonitor\.app\/pro"/);
  });

  it('PAGE_HEADERS contract preserved: text/html + DENY + no-store + Pragma', async () => {
    const res = consentPage(BASE_PARAMS, NONCE);
    assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
    assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.equal(res.headers.get('Pragma'), 'no-cache');
  });
});
