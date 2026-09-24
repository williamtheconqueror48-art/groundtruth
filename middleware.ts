/**
 * DIAGNOSTIC BISECT — temporary.
 *
 * The wrapped middleware throws at MODULE LOAD in Vercel's runtime
 * (import of ./middleware.impl fails) while the same bundle evaluates
 * fine in a local edge VM. This entry dynamically imports each
 * dependency of the real middleware with an isolated try/catch and
 * reports which one throws, with its stack.
 *
 * REMOVE after the root cause is fixed.
 */
export const config = {
  matcher: [
    '/mcp',
    '/api/:path*',
    '/((?!api(?:/|$)|mcp(?:/|$)|.*\\.[^/]+$).*)',
  ],
};

function fmt(label: string, err: unknown): string {
  const detail =
    err instanceof Error ? err.stack || `${err.name}: ${err.message}` : String(err);
  return `THROW ${label} :: ${detail}`.slice(0, 1500);
}

export default function middleware(_request: Request): Promise<Response> {
  return (async () => {
    const out: string[] = [];
    try {
      await import('./src/config/agent-not-found');
      out.push('OK ./src/config/agent-not-found');
    } catch (e) {
      out.push(fmt('./src/config/agent-not-found', e));
    }
    try {
      await import('./src/config/docs-locale-seo');
      out.push('OK ./src/config/docs-locale-seo');
    } catch (e) {
      out.push(fmt('./src/config/docs-locale-seo', e));
    }
    try {
      await import('./src/config/docs-root-redirects');
      out.push('OK ./src/config/docs-root-redirects');
    } catch (e) {
      out.push(fmt('./src/config/docs-root-redirects', e));
    }
    try {
      await import('./shared/agent-request-policy');
      out.push('OK ./shared/agent-request-policy');
    } catch (e) {
      out.push(fmt('./shared/agent-request-policy', e));
    }
    try {
      await import('./shared/mcp-host-policy');
      out.push('OK ./shared/mcp-host-policy');
    } catch (e) {
      out.push(fmt('./shared/mcp-host-policy', e));
    }
    try {
      const impl = await import('./middleware.impl');
      out.push(
        `OK ./middleware.impl (default export: ${typeof impl.default}, config: ${typeof impl.config})`,
      );
    } catch (e) {
      out.push(fmt('./middleware.impl', e));
    }
    return new Response(out.join('\n---\n'), {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  })();
}
