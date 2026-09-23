// Stubs for AI endpoints removed in the GROUNDTRUTH strip. The generated
// service contract (src/generated/, never hand-edited) still declares these
// methods, so the handler must implement them. They answer explicitly that
// the AI surface was removed instead of silently failing or resurrecting
// the deleted LLM pipeline.

import type {
  ClassifyEventResponse,
  DeductSituationRequest,
  DeductSituationResponse,
  GetCountryIntelBriefRequest,
  GetCountryIntelBriefResponse,
  ServerContext,
} from '../../../../src/generated/server/worldmonitor/intelligence/v1/service_server';

const REMOVED = 'This AI endpoint was removed from GROUNDTRUTH.';

export async function classifyEvent(
  _ctx: ServerContext,
  _req: unknown,
): Promise<ClassifyEventResponse> {
  return {};
}

export async function getCountryIntelBrief(
  _ctx: ServerContext,
  req: GetCountryIntelBriefRequest,
): Promise<GetCountryIntelBriefResponse> {
  return {
    countryCode: req.countryCode,
    countryName: req.countryCode,
    brief: REMOVED,
    model: 'removed',
    generatedAt: Date.now(),
    sources: [],
  };
}

export async function deductSituation(
  _ctx: ServerContext,
  _req: DeductSituationRequest,
): Promise<DeductSituationResponse> {
  return {
    analysis: REMOVED,
    model: 'removed',
    provider: 'removed',
  };
}
