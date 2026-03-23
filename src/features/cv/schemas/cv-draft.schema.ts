import { z } from 'zod';
import {
  cvPreviewDraftSchema,
  employabilityFlowDraftSchema,
} from '../../wizard/schemas/wizard-state.schema';

export const employabilityFlowSchema = employabilityFlowDraftSchema;

export type CvPreviewDraft = z.infer<typeof cvPreviewDraftSchema>;
export type EmployabilityFlowDraft = z.infer<typeof employabilityFlowSchema>;
