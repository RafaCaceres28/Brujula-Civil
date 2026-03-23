import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  pdfGenerationInputSchema,
  pdfGenerationOutputSchema,
  type PdfGenerationInput,
  type PdfGenerationOutput,
} from './document.schema';
import type {
  DocumentsDomainInput,
  DocumentsDomainOutput,
  DocumentsDomainResult,
} from '../types/document.types';

describe('pdfGenerationInputSchema', () => {
  it('accepts pdf generation input contract', () => {
    const input: PdfGenerationInput = {
      userId: 'user_123',
      cvPreview: {
        sections: [
          {
            id: 'section_1',
            title: 'Summary',
            content: 'Operations leader with transition-ready profile.',
            sourceBlockIds: ['block_1'],
          },
        ],
        layout: {
          templateKey: 'modern',
          columns: 2,
        },
        completeness: 'complete',
      },
      format: 'pdf',
      locale: 'es-CO',
    };

    expect(pdfGenerationInputSchema.parse(input)).toEqual(input);
  });

  it('rejects invalid format and extra keys in strict input object', () => {
    const invalidFormat = {
      userId: 'user_456',
      cvPreview: {
        sections: [
          {
            id: 'section_1',
            title: 'Summary',
            content: 'Valid content',
            sourceBlockIds: ['block_1'],
          },
        ],
        layout: {
          templateKey: 'single-column',
          columns: 1,
        },
        completeness: 'needs_review',
      },
      format: 'docx',
      locale: 'en-US',
    };

    expect(pdfGenerationInputSchema.safeParse(invalidFormat).success).toBe(false);

    const invalidExtraKey = {
      ...invalidFormat,
      format: 'pdf',
      extraField: 'not-allowed',
    };

    expect(pdfGenerationInputSchema.safeParse(invalidExtraKey).success).toBe(false);
  });
});

describe('pdfGenerationOutputSchema', () => {
  it('accepts output metadata with generated status', () => {
    const output: PdfGenerationOutput = {
      documentId: 'doc_123',
      status: 'generated',
      storagePath: 'documents/user_123/doc_123.pdf',
      downloadUrl: 'https://storage.example.com/documents/user_123/doc_123.pdf',
    };

    expect(pdfGenerationOutputSchema.parse(output)).toEqual(output);
  });

  it('normalizes optional fields and rejects invalid urls', () => {
    const parsed = pdfGenerationOutputSchema.parse({
      documentId: 'doc_456',
      status: 'queued',
      storagePath: '   ',
      downloadUrl: '   ',
    });

    expect(parsed.storagePath).toBeUndefined();
    expect(parsed.downloadUrl).toBeUndefined();

    expect(
      pdfGenerationOutputSchema.safeParse({
        documentId: 'doc_456',
        status: 'failed',
        downloadUrl: 'invalid-url',
      }).success,
    ).toBe(false);
  });

  it('keeps type compatibility with documents domain aliases', () => {
    expectTypeOf<PdfGenerationInput>().toEqualTypeOf<DocumentsDomainInput>();
    expectTypeOf<PdfGenerationOutput>().toEqualTypeOf<DocumentsDomainOutput>();
    expectTypeOf<DocumentsDomainResult>().toMatchTypeOf<
      | { ok: true; data: DocumentsDomainOutput }
      | { ok: false; error: { code: string; message: string } }
    >();
  });
});
