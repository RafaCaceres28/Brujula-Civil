import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';

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
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('queued');
    expect(body.data.storagePath).toContain('user-1');
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
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
