import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  createDomainError,
  domainFailure,
  domainSuccess,
  isDomainFailure,
  isDomainSuccess,
  mapZodIssues,
  safeParseWithDomainError,
} from '../index';

describe('shared contract kernel', () => {
  it('builds and narrows DomainResult using discriminated helpers', () => {
    const success = domainSuccess({ status: 'ok' as const });
    const failure = domainFailure(
      createDomainError({
        code: 'CONFLICT',
        message: 'Profile already submitted',
        retryable: false,
      }),
    );

    expect(isDomainSuccess(success)).toBe(true);
    expect(isDomainFailure(success)).toBe(false);
    expect(success.data.status).toBe('ok');

    expect(isDomainFailure(failure)).toBe(true);
    expect(isDomainSuccess(failure)).toBe(false);
    if (isDomainFailure(failure)) {
      expect(failure.error.code).toBe('CONFLICT');
      expect(failure.error.message).toBe('Profile already submitted');
      expect(failure.error.retryable).toBe(false);
    }
  });

  it('maps Zod issues to serializable detail shape', () => {
    const schema = z
      .object({
        userId: z.string().min(1),
        locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
      })
      .strict();

    const parsed = schema.safeParse({ userId: '', locale: 'es-es', extra: true });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const details = mapZodIssues(parsed.error.issues);

      expect(details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'userId', code: 'too_small' }),
          expect.objectContaining({ path: 'locale' }),
          expect.objectContaining({ code: 'unrecognized_keys', path: '(root)' }),
        ]),
      );
    }
  });

  it('returns DomainFailure with VALIDATION_ERROR when safe parse fails', () => {
    const schema = z.object({
      userId: z.string().trim().min(1),
      locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
    });

    const result = safeParseWithDomainError(
      schema,
      { userId: ' ', locale: 'es-es' },
      {
        message: 'Invalid translation input',
        details: { boundary: 'translation-action' },
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Invalid translation input');
      expect(result.error.retryable).toBe(false);
      expect(result.error.details).toMatchObject({
        boundary: 'translation-action',
      });
      expect(result.error.details).toHaveProperty('issues');
    }
  });

  it('returns DomainSuccess with parsed data when safe parse succeeds', () => {
    const schema = z.object({
      userId: z.string().trim().min(1),
      locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
    });

    const result = safeParseWithDomainError(schema, { userId: ' user-1 ', locale: 'es-ES' });

    expect(result).toEqual({
      ok: true,
      data: {
        userId: 'user-1',
        locale: 'es-ES',
      },
    });
  });
});
