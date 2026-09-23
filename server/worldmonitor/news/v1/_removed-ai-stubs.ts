// Stubs for AI endpoints removed in the GROUNDTRUTH strip. The generated
// service contract (src/generated/, never hand-edited) still declares these
// methods, so the handler must implement them. They answer explicitly that
// the AI surface was removed instead of silently failing or resurrecting
// the deleted LLM pipeline.

import type {
  ServerContext,
  SummarizeArticleResponse,
} from '../../../../src/generated/server/worldmonitor/news/v1/service_server';

const REMOVED = 'AI article summarization was removed from GROUNDTRUTH.';

function removedResponse(): SummarizeArticleResponse {
  return {
    summary: '',
    model: 'removed',
    provider: 'removed',
    tokens: 0,
    fallback: false,
    error: REMOVED,
    errorType: 'removed',
    status: 'SUMMARIZE_STATUS_ERROR',
    statusDetail: REMOVED,
  };
}

export async function summarizeArticle(
  _ctx: ServerContext,
  _req: unknown,
): Promise<SummarizeArticleResponse> {
  return removedResponse();
}

export async function getSummarizeArticleCache(
  _ctx: ServerContext,
  _req: unknown,
): Promise<SummarizeArticleResponse> {
  return removedResponse();
}
