import { describe, expect, it } from 'vitest';
import {
  domainIdSchema,
  domainMetaSchema,
  localeSchema,
  parseDomainId,
  parseDomainMeta,
  parseLocale,
} from '../index';

describe('shared schema contracts', () => {
  describe('domainIdSchema', () => {
    it('accepts valid domain ids', () => {
      expect(domainIdSchema.parse('request-123')).toBe('request-123');
      expect(domainIdSchema.parse('  source:translation_01  ')).toBe('source:translation_01');
      expect(parseDomainId('profile-user-1')).toBe('profile-user-1');
    });

    it('rejects empty ids and invalid characters', () => {
      expect(() => domainIdSchema.parse('')).toThrowError();
      expect(() => domainIdSchema.parse(' ')).toThrowError();
      expect(() => domainIdSchema.parse('request id')).toThrowError();
      expect(() => domainIdSchema.parse('#request')).toThrowError();
    });
  });

  describe('localeSchema', () => {
    it('accepts locale with language and optional country', () => {
      expect(localeSchema.parse('es')).toBe('es');
      expect(localeSchema.parse('es-ES')).toBe('es-ES');
      expect(parseLocale('en-US')).toBe('en-US');
    });

    it('rejects invalid locale formats', () => {
      expect(() => localeSchema.parse('ES')).toThrowError();
      expect(() => localeSchema.parse('es-es')).toThrowError();
      expect(() => localeSchema.parse('spa-ES')).toThrowError();
    });
  });

  describe('domainMetaSchema', () => {
    it('parses safe metadata for boundary logging and tracing', () => {
      const parsed = domainMetaSchema.parse({
        requestId: 'request-abc',
        timestamp: '2026-03-23T10:20:30.000Z',
        source: 'api',
      });

      expect(parsed).toEqual({
        requestId: 'request-abc',
        timestamp: '2026-03-23T10:20:30.000Z',
        source: 'api',
      });
      expect(parseDomainMeta(parsed)).toEqual(parsed);
    });

    it('rejects unsafe metadata payloads', () => {
      expect(() =>
        domainMetaSchema.parse({
          requestId: 'request-abc',
          timestamp: 'not-a-date',
          source: 'api',
        }),
      ).toThrowError();

      expect(() =>
        domainMetaSchema.parse({
          requestId: 'request-abc',
          timestamp: '2026-03-23T10:20:30.000Z',
          source: 'api',
          extra: 'not-allowed',
        }),
      ).toThrowError();
    });
  });
});
