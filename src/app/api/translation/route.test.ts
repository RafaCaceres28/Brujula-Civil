import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  },
}));

describe('translation route', () => {
  it('returns DomainResult success for valid input', async () => {
    const request = new Request('http://localhost/api/translation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        sourceProfile: {
          kind: 'profile_snapshot',
          snapshotId: 'snapshot-1',
          summary: 'Resumen profesional',
          highlights: ['Experiencia en liderazgo'],
        },
        sourceLanguage: 'es',
        targetLanguage: 'en',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.blocks[0].sourceRef).toBe('snapshot-1');
    expect(body.data.qualityFlags).toContain('MISSING_CONTEXT');
  });

  it('returns DomainResult validation error for invalid boundary input', async () => {
    const request = new Request('http://localhost/api/translation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
