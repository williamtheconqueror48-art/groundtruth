import type { NewsServiceHandler } from '../../../../src/generated/server/worldmonitor/news/v1/service_server';

import { getSummarizeArticleCache, summarizeArticle } from './_removed-ai-stubs';
import { listFeedDigest } from './list-feed-digest';
import { listCountryHeadlines } from './list-country-headlines';

export const newsHandler: NewsServiceHandler = {
  summarizeArticle,
  getSummarizeArticleCache,
  listFeedDigest,
  listCountryHeadlines,
};
