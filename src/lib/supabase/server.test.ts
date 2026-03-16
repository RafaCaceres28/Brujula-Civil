import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from './server';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

const ORIGINAL_ENV = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

describe('createClient', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_ENV.url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_ENV.anonKey;
  });

  it('creates server client when env variables are present', async () => {
    await createClient();

    expect(cookies).toHaveBeenCalledTimes(1);
    expect(createServerClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'public-anon-key',
      expect.any(Object),
    );
  });

  it('fails fast when supabase public env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    await expect(createClient()).rejects.toThrow(
      'Missing Supabase public env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
