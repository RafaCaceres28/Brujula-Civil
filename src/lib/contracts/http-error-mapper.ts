import type { DomainError } from './domain-error';
import type { DomainErrorCode } from './domain-error-codes';
import type { DomainResult } from './domain-result';

export const HTTP_STATUS_BY_DOMAIN_ERROR_CODE: Record<DomainErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  EXTERNAL_DEPENDENCY_ERROR: 502,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export const getHttpStatusForDomainErrorCode = (errorCode: DomainErrorCode): number => {
  return HTTP_STATUS_BY_DOMAIN_ERROR_CODE[errorCode] ?? 500;
};

export const getHttpStatusForDomainError = (error: DomainError): number => {
  return getHttpStatusForDomainErrorCode(error.code);
};

export const getHttpStatusForDomainResult = <TData>(
  result: DomainResult<TData, DomainError>,
  successStatus = 200,
): number => {
  if (result.ok) {
    return successStatus;
  }

  return getHttpStatusForDomainError(result.error);
};
