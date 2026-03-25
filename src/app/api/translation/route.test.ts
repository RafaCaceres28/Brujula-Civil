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
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
        selectedRouteContext: {
          reasonSummarySnapshot: 'Se recomienda por coincidencias de logistica y coordinacion.',
          fitLabelSnapshot: 'alto',
          guidanceSnapshot: 'Priorizala si quieres continuidad operativa inmediata.',
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.blocks[0].sourceRef).toBe('snapshot-1');
    expect(body.data.sourceRefMap[body.data.blocks[0].id]).toBe('snapshot-1');
    expect(body.data.selectedRouteContext).toMatchObject({
      fitLabelSnapshot: 'alto',
      guidanceSnapshot: 'Priorizala si quieres continuidad operativa inmediata.',
    });
    expect(body.meta.source).toBe('api.translation.route');
    expect(body.meta.requestId).toBeTypeOf('string');
    expect(response.headers.get('x-flow-trace')).toBe(
      'profile:snapshot-1;route:route-operations-coordinator-logistics-mid',
    );
    expect(response.headers.get('x-route-fit-label')).toBe('alto');
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
    expect(body.meta.source).toBe('api.translation.route');
  });

  it('keeps backward compatibility when selectedRouteId is missing', async () => {
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
    expect(body.data.selectedRouteId).toBeUndefined();
    expect(response.headers.get('x-flow-trace')).toBe('profile:snapshot-1;route:legacy-compatible');
  });

  it('uses safe explainability fallback when selectedRouteId format is invalid', async () => {
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
        selectedRouteId: 'route invalida con espacios',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.selectedRouteId).toBeUndefined();
    expect(response.headers.get('x-flow-trace')).toBe('profile:snapshot-1;route:legacy-compatible');
    expect(response.headers.get('x-explainability-status')).toBe('fallback');
  });
});
