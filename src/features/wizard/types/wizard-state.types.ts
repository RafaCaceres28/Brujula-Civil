import type { z } from 'zod';
import type {
  cvPreviewDraftSchema,
  cvPreviewTraceSchema,
  employabilityFlowDraftSchema,
  employabilityFlowStateSchema,
  pdfExportTraceSchema,
  translationTraceSchema,
} from '../schemas/wizard-state.schema';

export type EmployabilityFlowState = z.infer<typeof employabilityFlowStateSchema>;
export type TranslationTrace = z.infer<typeof translationTraceSchema>;
export type CvPreviewTrace = z.infer<typeof cvPreviewTraceSchema>;
export type PdfExportTrace = z.infer<typeof pdfExportTraceSchema>;
export type CvPreviewDraft = z.infer<typeof cvPreviewDraftSchema>;
export type EmployabilityFlowDraft = z.infer<typeof employabilityFlowDraftSchema>;
