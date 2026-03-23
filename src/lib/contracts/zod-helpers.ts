import { z } from 'zod';
import { createValidationDomainError, type DomainError } from './domain-error';
import { domainFailure, domainSuccess, type DomainResult } from './domain-result';

export type ZodIssueDetail = {
  code: string;
  path: string;
  message: string;
};

export type ZodSafeParseOptions = {
  message?: string;
  details?: Record<string, unknown>;
};

export const mapZodIssues = (issues: z.ZodIssue[]): ZodIssueDetail[] => {
  return issues.map((issue) => ({
    code: issue.code,
    path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    message: issue.message,
  }));
};

export const safeParseWithDomainError = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
  options?: ZodSafeParseOptions,
): DomainResult<z.infer<TSchema>, DomainError> => {
  const parsed = schema.safeParse(input);

  if (parsed.success) {
    return domainSuccess(parsed.data);
  }

  const message = options?.message ?? 'Invalid input payload';
  const details = {
    ...(options?.details ?? {}),
    issues: mapZodIssues(parsed.error.issues),
  };

  return domainFailure(createValidationDomainError(message, details));
};
