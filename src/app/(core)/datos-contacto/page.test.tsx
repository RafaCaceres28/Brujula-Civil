import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { readContactDetails } from '@/features/profile/server/contact-details';
import ContactDetailsPage from './page';

vi.mock('@/features/auth/server/get-required-user', () => ({ getRequiredUser: vi.fn() }));
vi.mock('@/features/profile/server/contact-details', () => ({ readContactDetails: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRequiredUser).mockResolvedValue({
    id: 'owner',
    email: 'login-only@example.test',
  } as never);
});

describe('/datos-contacto', () => {
  it('authenticates with its own destination and reads saved values without account email defaults', async () => {
    vi.mocked(readContactDetails).mockResolvedValue({
      ok: true,
      data: { display_name: 'Ana', phone: '123', contact_email: null, locality_province: null },
    });
    const html = renderToStaticMarkup(await ContactDetailsPage());
    expect(getRequiredUser).toHaveBeenCalledExactlyOnceWith('/datos-contacto');
    expect(readContactDetails).toHaveBeenCalledExactlyOnceWith('owner');
    expect(html).toContain('value="Ana"');
    expect(html).toContain('value="123"');
    expect(html).not.toContain('login-only@example.test');
    expect(html).toContain('href="/cv-borrador"');
    expect(html).toContain('href="/perfil-profesional"');
  });
  it('allows a genuinely absent base but never renders an unsafe empty form on read error', async () => {
    vi.mocked(readContactDetails).mockResolvedValueOnce({ ok: true, data: null });
    expect(renderToStaticMarkup(await ContactDetailsPage())).toContain('<form');
    vi.mocked(readContactDetails).mockResolvedValueOnce({
      ok: false,
      error: { code: 'EXTERNAL_DEPENDENCY_ERROR', message: 'Recarga para reintentar.' },
    });
    const html = renderToStaticMarkup(await ContactDetailsPage());
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('<form');
  });
  it('does not read storage before authentication', async () => {
    vi.mocked(getRequiredUser).mockRejectedValue(new Error('redirect'));
    await expect(ContactDetailsPage()).rejects.toThrow('redirect');
    expect(readContactDetails).not.toHaveBeenCalled();
  });
});
