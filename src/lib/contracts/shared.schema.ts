import { z } from 'zod';
import type { DomainMeta } from './domain-meta';

const DOMAIN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]*$/;
const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export const domainIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(DOMAIN_ID_PATTERN, 'Invalid domain identifier format');

export const localeSchema = z
  .string()
  .trim()
  .regex(LOCALE_PATTERN, 'Locale must match ll or ll-CC format');

export const timestampSchema = z.string().datetime({ offset: true });

export const domainMetaSchema = z
  .object({
    requestId: domainIdSchema.optional(),
    timestamp: timestampSchema,
    source: z.string().trim().min(1).max(64),
  })
  .strict();

export const parseDomainId = (value: unknown): string => {
  return domainIdSchema.parse(value);
};

export const parseLocale = (value: unknown): string => {
  return localeSchema.parse(value);
};

export const parseDomainMeta = (value: unknown): DomainMeta => {
  return domainMetaSchema.parse(value);
};
