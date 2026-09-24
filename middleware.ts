/**
 * DIAGNOSTIC WRAPPER — temporary.
 *
 * Production returns MIDDLEWARE_INVOCATION_FAILED on every request the
 * middleware processes, while the same bundle passes in a local edge VM.
 * This wrapper surfaces the real exception as response text so the root
 * cause can be read from the deployed site instead of guessed at.
 *
 * If the failure is at module load, the import below throws and Vercel
 * still reports MIDDLEWARE_INVOCATION_FAILED (binary signal: load-time).
 * If the failure is inside the handler, the response body carries the
 * stack (signal: invoke-time + the actual error).
 *
 * REMOVE after the root cause is fixed; the real middleware lives in
 * middleware.impl.ts.
 */
export { config } from './middleware.impl';
import impl from './middleware.impl';

function errorResponse(err: unknown): Response {
  const detail =
    err instanceof Error
      ? err.stack || `${err.name}: ${err.message}`
      : String(err);
  return new Response(`MIDDLEWARE_THREW\n${detail}`.slice(0, 4000), {
    status: 500,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export default function middleware(
  request: Request,
): Response | undefined | Promise<Response | undefined> {
  let result: unknown;
  try {
    result = (impl as (req: Request) => unknown)(request);
  } catch (err) {
    return errorResponse(err);
  }
  if (result instanceof Promise) {
    return result.catch(errorResponse);
  }
  return result as Response | undefined;
}
