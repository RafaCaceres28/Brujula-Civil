import { createClient } from '@/lib/supabase/server';
import {
  domainFailure,
  domainSuccess,
  toInternalDomainError,
  type DomainMeta,
} from '../../../lib/contracts/index';
import { employabilityFlowSchema, type CvPreviewDraft } from '../schemas/cv-draft.schema';

const GET_CV_SOURCE = 'cv.server.get-cv';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createMeta(requestId?: string): DomainMeta {
  return {
    timestamp: new Date().toISOString(),
    source: GET_CV_SOURCE,
    ...(requestId ? { requestId } : {}),
  };
}

export async function getCvDraft(userId: string, requestId?: string) {
  const meta = createMeta(requestId);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_wizard_state')
      .select('aggregated_draft_jsonb')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return domainFailure(toInternalDomainError(error, 'Failed to load CV draft state'), meta);
    }

    const aggregatedDraft = isRecord(data?.aggregated_draft_jsonb)
      ? data.aggregated_draft_jsonb
      : {};
    const rawEmployabilityFlow = isRecord(aggregatedDraft.employabilityFlow)
      ? aggregatedDraft.employabilityFlow
      : {};
    const employabilityFlowResult = employabilityFlowSchema.safeParse(rawEmployabilityFlow);

    if (!employabilityFlowResult.success || !employabilityFlowResult.data.cvPreviewDraft) {
      const legacyDraftResult = employabilityFlowSchema.shape.cvPreviewDraft.safeParse(
        rawEmployabilityFlow.cvPreviewDraft,
      );

      if (!legacyDraftResult.success || !legacyDraftResult.data) {
        return domainSuccess<CvPreviewDraft | null>(null, meta);
      }

      return domainSuccess<CvPreviewDraft | null>(legacyDraftResult.data, meta);
    }

    return domainSuccess<CvPreviewDraft | null>(employabilityFlowResult.data.cvPreviewDraft, meta);
  } catch (error) {
    return domainFailure(toInternalDomainError(error, 'Failed to load CV draft state'), meta);
  }
}
