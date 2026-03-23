import { describe, expect, it } from 'vitest';
import {
  DOMAIN_ERROR_CODES,
  createDomainError,
  createValidationDomainError,
  isDomainError,
  isDomainErrorCode,
  toInternalDomainError,
} from '../index';

describe('domain error taxonomy', () => {
  it('keeps the shared taxonomy stable', () => {
    expect(DOMAIN_ERROR_CODES).toEqual([
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'CONFLICT',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'EXTERNAL_DEPENDENCY_ERROR',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
    ]);
  });

  it('validates domain error codes with a type guard', () => {
    expect(isDomainErrorCode('VALIDATION_ERROR')).toBe(true);
    expect(isDomainErrorCode('UNKNOWN')).toBe(false);
    expect(isDomainErrorCode(10)).toBe(false);
  });

  it('creates a safe typed domain error with trimmed values', () => {
    const domainError = createDomainError({
      code: 'NOT_FOUND',
      message: '  Contract not found  ',
      cause: '  Missing id  ',
      retryable: false,
      details: {
        id: 'abc-123',
      },
    });

    expect(domainError).toEqual({
      code: 'NOT_FOUND',
      message: 'Contract not found',
      cause: 'Missing id',
      retryable: false,
      details: {
        id: 'abc-123',
      },
    });
  });

  it('rejects non-record details to keep error payload predictable', () => {
    expect(() =>
      createDomainError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload',
        details: ['not-allowed'] as unknown as Record<string, unknown>,
      }),
    ).toThrowError();
  });

  it('builds validation errors with retryable false', () => {
    const domainError = createValidationDomainError('Invalid input', { field: 'locale' });

    expect(domainError).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      retryable: false,
      details: { field: 'locale' },
    });
  });

  it('maps unknown values to internal domain errors', () => {
    const domainError = toInternalDomainError(new Error('Provider unavailable'));

    expect(domainError).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Provider unavailable',
      cause: 'Error',
      retryable: false,
    });
    expect(isDomainError(domainError)).toBe(true);
  });
});
