import { z } from 'zod';
import { DOMAIN_ERROR_CODES, type DomainErrorCode, isDomainErrorCode } from './domain-error-codes';

const domainErrorCodeSchema = z.enum(DOMAIN_ERROR_CODES);

const domainErrorSchema = z
  .object({
    code: domainErrorCodeSchema,
    message: z.string().trim().min(1).max(300),
    cause: z.string().trim().min(1).max(300).optional(),
    retryable: z.boolean().optional(),
    details: z.record(z.string().trim().min(1), z.unknown()).optional(),
  })
  .strict();

type DomainErrorParsed = z.infer<typeof domainErrorSchema>;

export type DomainError = {
  code: DomainErrorCode;
  message: string;
  cause?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
};

export type DomainErrorInput = {
  code: DomainErrorCode;
  message: string;
  cause?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
};

const toDomainError = (parsed: DomainErrorParsed): DomainError => {
  return {
    code: parsed.code,
    message: parsed.message,
    ...(parsed.cause ? { cause: parsed.cause } : {}),
    ...(parsed.retryable !== undefined ? { retryable: parsed.retryable } : {}),
    ...(parsed.details ? { details: parsed.details } : {}),
  };
};

export const createDomainError = (input: DomainErrorInput): DomainError => {
  const parsed = domainErrorSchema.parse(input);
  return toDomainError(parsed);
};

export const isDomainError = (value: unknown): value is DomainError => {
  const result = domainErrorSchema.safeParse(value);
  return result.success;
};

export const toInternalDomainError = (
  value: unknown,
  fallbackMessage = 'Unexpected domain error',
): DomainError => {
  const result = domainErrorSchema.safeParse(value);
  if (result.success) {
    return toDomainError(result.data);
  }

  const message =
    value instanceof Error && value.message.trim().length > 0 ? value.message : fallbackMessage;
  const cause = value instanceof Error && value.name.trim().length > 0 ? value.name : undefined;

  return {
    code: 'INTERNAL_ERROR',
    message,
    ...(cause ? { cause } : {}),
    retryable: false,
  };
};

export const createValidationDomainError = (
  message: string,
  details?: Record<string, unknown>,
): DomainError => {
  return createDomainError({
    code: 'VALIDATION_ERROR',
    message,
    retryable: false,
    ...(details ? { details } : {}),
  });
};

export { isDomainErrorCode };
