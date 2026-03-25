import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  },
}));

describe('cv generate route', () => {
  it('returns DomainResult success for valid input', async () => {
    const request = new Request('http://localhost/api/cv/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        profileSnapshotId: 'snapshot-1',
        translatedContent: {
          blocks: [
            {
              id: 'translation-block-1',
              content: 'Ingeniero de software con experiencia en backend',
              sourceRef: 'snapshot-1',
            },
          ],
          sourceRefMap: {
            'translation-block-1': 'snapshot-1',
          },
          qualityFlags: [],
          selectedRouteId: 'route-operations-coordinator-logistics-mid',
        },
        templateKey: 'single-column',
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.layout.columns).toBe(1);
    expect(body.data.sections[0].sourceBlockIds).toEqual(['translation-block-1']);
    expect(body.data.selectedRouteId).toBe('route-operations-coordinator-logistics-mid');
    expect(body.meta.source).toBe('api.cv.generate.route');
    expect(response.headers.get('x-flow-trace')).toBe(
      'profile:snapshot-1;route:route-operations-coordinator-logistics-mid',
    );
  });

  it('returns DomainResult validation error for invalid boundary input', async () => {
    const request = new Request('http://localhost/api/cv/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        profileSnapshotId: 'snapshot-1',
        translatedContent: {
          blocks: [],
          sourceRefMap: {},
          qualityFlags: [],
        },
        templateKey: 'single-column',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.meta.source).toBe('api.cv.generate.route');
  });
});
