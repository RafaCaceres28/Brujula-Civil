'use server';

import { z } from 'zod';
import { requireUser } from '@/features/auth/server/require-user';
import {
  domainFailure,
  safeParseWithDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import { selectCareerRoute, type SelectCareerRouteResult } from '../server/select-career-route';
import type { RecommendationSelection } from '../schemas/recommendation.schema';

const SELECT_CAREER_ROUTE_ACTION_SOURCE = 'recs.action.select-career-route';

const selectCareerRouteActionSchema = z
  .object({
    recommendationSetId: z.string().trim().min(1).max(128),
    selectedRouteId: z.string().trim().min(1).max(128),
    requestId: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

type SelectCareerRouteActionInput = z.infer<typeof selectCareerRouteActionSchema>;
export type SelectCareerRouteActionResult = DomainResult<RecommendationSelection>;

function createMeta(nowIso: string, requestId?: string): DomainMeta {
  return {
    timestamp: nowIso,
    source: SELECT_CAREER_ROUTE_ACTION_SOURCE,
    ...(requestId ? { requestId } : {}),
  };
}

function withActionMeta(
  result: SelectCareerRouteResult,
  meta: DomainMeta,
): SelectCareerRouteResult {
  return {
    ...result,
    meta,
  };
}

export async function selectCareerRouteAction(
  input: unknown,
): Promise<SelectCareerRouteActionResult> {
  const nowIso = new Date().toISOString();

  const parsedInput = safeParseWithDomainError(selectCareerRouteActionSchema, input, {
    message: 'Invalid select route action payload',
  });

  const requestId = parsedInput.ok ? parsedInput.data.requestId : undefined;
  const meta = createMeta(nowIso, requestId);

  if (!parsedInput.ok) {
    return domainFailure(parsedInput.error, meta);
  }

  const user = await requireUser();
  const payload: SelectCareerRouteActionInput = parsedInput.data;

  const result = await selectCareerRoute({
    userId: user.id,
    recommendationSetId: payload.recommendationSetId,
    selectedRouteId: payload.selectedRouteId,
    requestId: payload.requestId,
  });

  return withActionMeta(result, meta);
}
