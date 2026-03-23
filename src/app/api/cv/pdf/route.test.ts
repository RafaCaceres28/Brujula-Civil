import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import * as exportCvPdfModule from '../../../../features/cv/server/export-cv-pdf';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  },
}));

describe('cv pdf route', () => {
  it('returns DomainResult success for valid input', async () => {
    const request = new Request('http://localhost/api/cv/pdf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        cvPreview: {
          sections: [
            {
              id: 'cv-section-summary',
              title: 'Resumen',
              content: 'Perfil profesional orientado a resultados',
              sourceBlockIds: ['translation-block-1'],
            },
          ],
          layout: {
            templateKey: 'single-column',
            columns: 1,
          },
          completeness: 'needs_review',
        },
        format: 'pdf',
        locale: 'es',
        previewVersionId: 'preview-v1',
        isUserEdited: true,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('queued');
    expect(body.data.storagePath).toContain('user-1');
    expect(body.meta.source).toBe('api.cv.pdf.route');
    expect(response.headers.get('x-flow-trace')).toBe('preview:preview-v1');
  });

  it('returns DomainResult validation error for invalid boundary input', async () => {
    const request = new Request('http://localhost/api/cv/pdf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        cvPreview: {
          sections: [
            {
              id: 'cv-section-summary',
              title: 'Resumen',
              content: 'Perfil profesional orientado a resultados',
              sourceBlockIds: ['translation-block-1'],
            },
          ],
          layout: {
            templateKey: 'single-column',
            columns: 1,
          },
          completeness: 'needs_review',
        },
        format: 'docx',
        locale: 'es',
        previewVersionId: 'preview-v1',
        isUserEdited: true,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.meta.source).toBe('api.cv.pdf.route');
  });

  it('returns DomainResult validation error when checkpoint version is missing', async () => {
    const request = new Request('http://localhost/api/cv/pdf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        cvPreview: {
          sections: [
            {
              id: 'cv-section-summary',
              title: 'Resumen',
              content: 'Perfil profesional orientado a resultados',
              sourceBlockIds: ['translation-block-1'],
            },
          ],
          layout: {
            templateKey: 'single-column',
            columns: 1,
          },
          completeness: 'needs_review',
        },
        format: 'pdf',
        locale: 'es',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('normalizes thrown errors to user-safe DomainError payloads', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exportSpy = vi
      .spyOn(exportCvPdfModule, 'exportCvPdf')
      .mockRejectedValueOnce(new Error('database timeout: internal stack detail'));

    const request = new Request('http://localhost/api/cv/pdf', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'req-safe-1',
      },
      body: JSON.stringify({
        userId: 'user-1',
        cvPreview: {
          sections: [
            {
              id: 'cv-section-summary',
              title: 'Resumen',
              content: 'Perfil profesional orientado a resultados',
              sourceBlockIds: ['translation-block-1'],
            },
          ],
          layout: {
            templateKey: 'single-column',
            columns: 1,
          },
          completeness: 'needs_review',
        },
        format: 'pdf',
        locale: 'es',
        previewVersionId: 'preview-v1',
        isUserEdited: true,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe(
      'No pudimos iniciar la exportacion de PDF. Intenta nuevamente.',
    );
    expect(body.error.message).not.toContain('database timeout');
    expect(body.error.details.requestId).toBe('req-safe-1');
    expect(body.meta.requestId).toBe('req-safe-1');
    expect(errorSpy).toHaveBeenCalledTimes(1);

    exportSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
