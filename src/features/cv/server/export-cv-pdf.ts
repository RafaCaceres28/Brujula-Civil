import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  type DomainMeta,
} from '../../../lib/contracts/index';
import { createClient } from '../../../lib/supabase/server';
import { generatePdf, mapCvPreviewToPdfGenerationInput } from '../../documents/server/generate-pdf';
import type { DocumentsDomainResult } from '../../documents/types/document.types';
import { employabilityFlowSchema } from '../schemas/cv-draft.schema';
import { parseEditableCvPreviewBoundary } from '../services/cv.mapper';
import type { CvDomainOutput } from '../types/cv.types';

type ExportCvPdfInput = {
  userId: string;
  cvPreview: CvDomainOutput;
  locale: string;
  previewVersionId: string;
  isUserEdited: boolean;
  selectedRouteId?: string;
  requestId?: string;
};

const EXPORT_SOURCE = 'cv.server.export-cv-pdf';

type SnapshotTagInput = {
  userId: string;
  previewVersionId: string;
};

type PersistExportTraceInput = {
  userId: string;
  requestId: string;
  previewVersionId: string;
  selectedRouteId?: string;
  documentId: string;
  status: 'queued' | 'generated' | 'failed';
  storagePath?: string;
  downloadUrl?: string;
};

function createExportMeta(input: Pick<ExportCvPdfInput, 'requestId'>): DomainMeta {
  return {
    timestamp: new Date().toISOString(),
    source: EXPORT_SOURCE,
    ...(input.requestId ? { requestId: input.requestId } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withTraceability(
  meta: DomainMeta,
  input: { previewVersionId: string; selectedRouteId?: string; documentId?: string },
): DomainMeta {
  return {
    ...meta,
    traceability: {
      previewVersionId: input.previewVersionId,
      ...(input.selectedRouteId ? { selectedRouteId: input.selectedRouteId } : {}),
      ...(input.documentId ? { documentId: input.documentId } : {}),
    },
  };
}

async function persistExportTrace(input: PersistExportTraceInput): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: currentState } = await supabase
    .from('user_wizard_state')
    .select('aggregated_draft_jsonb')
    .eq('user_id', input.userId)
    .maybeSingle();

  const currentAggregatedDraft = isRecord(currentState?.aggregated_draft_jsonb)
    ? currentState.aggregated_draft_jsonb
    : {};
  const currentEmployabilityFlow = employabilityFlowSchema.safeParse(
    currentAggregatedDraft.employabilityFlow,
  );

  const nextEmployabilityFlow = employabilityFlowSchema.parse({
    ...(currentEmployabilityFlow.success ? currentEmployabilityFlow.data : {}),
    export: {
      requestId: input.requestId,
      previewVersionId: input.previewVersionId,
      ...(input.selectedRouteId ? { selectedRouteId: input.selectedRouteId } : {}),
      documentId: input.documentId,
      status: input.status,
      storagePath: input.storagePath ?? null,
      downloadUrl: input.downloadUrl ?? null,
      requestedAt: now,
    },
    lastUpdatedAt: now,
  });

  await supabase
    .from('user_wizard_state')
    .update({
      aggregated_draft_jsonb: {
        ...currentAggregatedDraft,
        employabilityFlow: nextEmployabilityFlow,
      },
      last_saved_at: now,
    })
    .eq('user_id', input.userId);
}

export function buildPreviewSnapshotTag(input: SnapshotTagInput): string {
  return `${input.userId}:${input.previewVersionId}`;
}

export function createPreviewVersionId(): string {
  return `preview-${Date.now()}`;
}

export async function exportCvPdf(input: ExportCvPdfInput): Promise<DocumentsDomainResult> {
  const meta = createExportMeta(input);
  const selectedRouteId = input.selectedRouteId ?? input.cvPreview.selectedRouteId;

  if (!input.isUserEdited) {
    return domainFailure(
      createValidationDomainError('Manual edit confirmation is required before PDF export', {
        previewVersionId: input.previewVersionId,
      }),
      meta,
    );
  }

  const previewBoundary = parseEditableCvPreviewBoundary(input.cvPreview);
  if (!previewBoundary.ok) {
    return domainFailure(previewBoundary.error, meta);
  }

  const pdfInput = mapCvPreviewToPdfGenerationInput({
    userId: input.userId,
    cvPreview: previewBoundary.data,
    locale: input.locale,
    selectedRouteId,
  });

  const hasSemanticDrift = pdfInput.cvPreview.sections.some((section, index) => {
    return section.content !== previewBoundary.data.sections[index]?.content;
  });

  if (hasSemanticDrift) {
    return domainFailure(
      createValidationDomainError('Preview snapshot does not match PDF payload', {
        previewVersionId: input.previewVersionId,
      }),
      meta,
    );
  }

  const pdfResult = await generatePdf(pdfInput);
  if (!pdfResult.ok) {
    return domainFailure(
      pdfResult.error,
      withTraceability(meta, {
        previewVersionId: input.previewVersionId,
        selectedRouteId,
      }),
    );
  }

  try {
    await persistExportTrace({
      userId: input.userId,
      requestId: input.requestId ?? crypto.randomUUID(),
      previewVersionId: input.previewVersionId,
      selectedRouteId,
      documentId: pdfResult.data.documentId,
      status: pdfResult.data.status,
      storagePath: pdfResult.data.storagePath,
      downloadUrl: pdfResult.data.downloadUrl,
    });
  } catch {
    // Best-effort persistence to avoid blocking PDF queueing.
  }

  return domainSuccess(
    pdfResult.data,
    withTraceability(meta, {
      previewVersionId: input.previewVersionId,
      selectedRouteId,
      documentId: pdfResult.data.documentId,
    }),
  );
}
