import { createClient } from '@/lib/supabase/server';
import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import { employabilityFlowSchema, type CvPreviewDraft } from '../schemas/cv-draft.schema';
import { parseEditableCvPreviewBoundary } from '../services/cv.mapper';
import type { CvDomainOutput } from '../types/cv.types';

const SAVE_CV_SOURCE = 'cv.server.save-cv';

type SaveCvInput = {
  userId: string;
  cvPreview: CvDomainOutput;
  previewVersionId: string;
  isUserEdited: boolean;
  profileSnapshotId?: string;
  sourceRefMap?: Record<string, string>;
  requestId?: string;
};

type SaveCvResult = DomainResult<CvPreviewDraft>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createMeta(requestId?: string): DomainMeta {
  return {
    timestamp: new Date().toISOString(),
    source: SAVE_CV_SOURCE,
    ...(requestId ? { requestId } : {}),
  };
}

export async function saveCvDraft(input: SaveCvInput): Promise<SaveCvResult> {
  const meta = createMeta(input.requestId);

  if (!input.isUserEdited) {
    return domainFailure(
      createValidationDomainError('Manual edit confirmation is required before saving CV draft'),
      meta,
    );
  }

  const editablePreview = parseEditableCvPreviewBoundary(input.cvPreview);
  if (!editablePreview.ok) {
    return domainFailure(editablePreview.error, meta);
  }

  const now = new Date().toISOString();

  try {
    const supabase = await createClient();

    const { data: currentState, error: currentStateError } = await supabase
      .from('user_wizard_state')
      .select('aggregated_draft_jsonb')
      .eq('user_id', input.userId)
      .maybeSingle();

    if (currentStateError) {
      return domainFailure(
        toInternalDomainError(currentStateError, 'Failed to load current CV draft state'),
        meta,
      );
    }

    const currentAggregatedDraft = isRecord(currentState?.aggregated_draft_jsonb)
      ? currentState.aggregated_draft_jsonb
      : {};

    const currentEmployabilityFlow = employabilityFlowSchema.safeParse(
      currentAggregatedDraft.employabilityFlow,
    );

    const nextDraft = {
      previewVersionId: input.previewVersionId,
      cvPreview: editablePreview.data,
      isUserEdited: true,
      updatedAt: now,
      ...(input.profileSnapshotId ? { profileSnapshotId: input.profileSnapshotId } : {}),
      sourceRefMap: input.sourceRefMap ?? {},
    } satisfies CvPreviewDraft;

    const nextEmployabilityFlow = employabilityFlowSchema.parse({
      ...(currentEmployabilityFlow.success ? currentEmployabilityFlow.data : {}),
      cvPreviewDraft: nextDraft,
      lastUpdatedAt: now,
    });

    const nextAggregatedDraft = {
      ...currentAggregatedDraft,
      employabilityFlow: nextEmployabilityFlow,
    };

    const { error: updateError } = await supabase
      .from('user_wizard_state')
      .update({
        aggregated_draft_jsonb: nextAggregatedDraft,
        last_saved_at: now,
      })
      .eq('user_id', input.userId);

    if (updateError) {
      return domainFailure(toInternalDomainError(updateError, 'Failed to persist CV draft'), meta);
    }

    return domainSuccess(nextDraft, meta);
  } catch (error) {
    return domainFailure(toInternalDomainError(error, 'Failed to persist CV draft'), meta);
  }
}
