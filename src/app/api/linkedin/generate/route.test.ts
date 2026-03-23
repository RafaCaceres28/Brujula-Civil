import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  },
}));

describe('linkedin generate route', () => {
  it('returns DomainResult success for valid input', async () => {
    const request = new Request('http://localhost/api/linkedin/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        profileUrl: 'https://www.linkedin.com/in/test-user',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.headline).toBe('Profile imported from LinkedIn URL');
    expect(body.data.experience).toEqual([]);
  });

  it('returns DomainResult validation error for invalid boundary input', async () => {
    const request = new Request('http://localhost/api/linkedin/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        profileUrl: 'not-a-valid-url',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
