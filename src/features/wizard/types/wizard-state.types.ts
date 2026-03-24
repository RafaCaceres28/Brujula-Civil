import type { z } from 'zod';
import type {
  cvPreviewDraftSchema,
  cvPreviewTraceSchema,
  employabilityFlowDraftSchema,
  employabilityFlowStateSchema,
  pdfExportTraceSchema,
  translationTraceSchema,
} from '../schemas/wizard-state.schema';
import type {
  recommendationOutputSchema,
  recommendationSelectionSchema,
} from '../../recommendations/schemas/recommendation.schema';

export type EmployabilityFlowState = z.infer<typeof employabilityFlowStateSchema>;
export type TranslationTrace = z.infer<typeof translationTraceSchema>;
export type CvPreviewTrace = z.infer<typeof cvPreviewTraceSchema>;
export type PdfExportTrace = z.infer<typeof pdfExportTraceSchema>;
export type RecommendationsTrace = z.infer<typeof recommendationOutputSchema>;
export type SelectedRouteTrace = z.infer<typeof recommendationSelectionSchema>;
export type SelectedRecommendationTrace = z.infer<typeof recommendationSelectionSchema>;
export type CvPreviewDraft = z.infer<typeof cvPreviewDraftSchema>;
export type EmployabilityFlowDraft = z.infer<typeof employabilityFlowDraftSchema>;
