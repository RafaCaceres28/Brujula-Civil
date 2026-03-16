import { createClient } from '@/lib/supabase/server';
import { describe, expect, it, vi } from 'vitest';
import { GET } from '../../../app/(auth)/callback/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

function createSupabaseMock(error: { message: string } | null) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error }),
    },
  };
}

describe('auth callback route', () => {
  it('redirects to sanitized next path when code exchange succeeds', async () => {
    const client = createSupabaseMock(null);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const response = await GET(
      new Request('https://app.example.com/callback?code=valid&next=/perfil'),
    );

    expect(response.headers.get('location')).toBe('https://app.example.com/perfil');
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('valid');
  });

  it('redirects to login when callback has no code', async () => {
    const response = await GET(new Request('https://app.example.com/callback?next=/dashboard'));

    expect(response.headers.get('location')).toBe(
      'https://app.example.com/login?authError=missing_code',
    );
  });

  it('redirects to login when code exchange fails', async () => {
    const client = createSupabaseMock({ message: 'invalid grant' });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const response = await GET(new Request('https://app.example.com/callback?code=invalid'));

    expect(response.headers.get('location')).toBe(
      'https://app.example.com/login?authError=auth_callback_failed',
    );
  });

  it('falls back to dashboard for unsafe next values', async () => {
    const client = createSupabaseMock(null);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const response = await GET(
      new Request('https://app.example.com/callback?code=valid&next=https://evil.com'),
    );

    expect(response.headers.get('location')).toBe('https://app.example.com/dashboard');
  });

  it('falls back to dashboard for malformed next values', async () => {
    const client = createSupabaseMock(null);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const response = await GET(new Request('https://app.example.com/callback?code=valid&next=/%'));

    expect(response.headers.get('location')).toBe('https://app.example.com/dashboard');
  });
});
