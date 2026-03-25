import { z } from 'zod';
import { domainIdSchema, localeSchema } from '../../../lib/contracts/index';
import { cvPreviewOutputSchema } from '../../cv/schemas/cv.schema';

const MAX_STORAGE_PATH_LENGTH = 512;
const MAX_URL_LENGTH = 2048;

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }

    return value;
  }, z.string().trim().min(1).max(maxLength).optional());

export const pdfFormatSchema = z.literal('pdf');

export const pdfGenerationStatusSchema = z.enum(['queued', 'generated', 'failed']);

export const pdfGenerationInputSchema = z
  .object({
    userId: domainIdSchema,
    cvPreview: cvPreviewOutputSchema,
    format: pdfFormatSchema,
    locale: localeSchema,
    selectedRouteId: domainIdSchema.optional(),
  })
  .strict();

export const pdfGenerationOutputSchema = z
  .object({
    documentId: domainIdSchema,
    status: pdfGenerationStatusSchema,
    storagePath: optionalTrimmedString(MAX_STORAGE_PATH_LENGTH),
    downloadUrl: z.preprocess((value) => {
      if (value === undefined || value === null) {
        return undefined;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      }

      return value;
    }, z.string().url().max(MAX_URL_LENGTH).optional()),
  })
  .strict();

export type PdfGenerationInput = z.infer<typeof pdfGenerationInputSchema>;
export type PdfGenerationOutput = z.infer<typeof pdfGenerationOutputSchema>;
export type PdfFormat = z.infer<typeof pdfFormatSchema>;
export type PdfGenerationStatus = z.infer<typeof pdfGenerationStatusSchema>;
