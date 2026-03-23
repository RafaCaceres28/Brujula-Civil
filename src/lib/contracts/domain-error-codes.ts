export const DOMAIN_ERROR_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'EXTERNAL_DEPENDENCY_ERROR',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

const DOMAIN_ERROR_CODE_SET = new Set<DomainErrorCode>(DOMAIN_ERROR_CODES);

export const isDomainErrorCode = (value: unknown): value is DomainErrorCode => {
  return typeof value === 'string' && DOMAIN_ERROR_CODE_SET.has(value as DomainErrorCode);
};
