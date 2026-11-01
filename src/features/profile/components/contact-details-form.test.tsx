import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveContactDetailsAction } from '../actions/save-contact-details-action';
import { ContactDetailsForm } from './contact-details-form';

vi.mock('../actions/save-contact-details-action', () => ({ saveContactDetailsAction: vi.fn() }));
let container: HTMLDivElement;
let root: Root;
const blank = { display_name: null, phone: null, contact_email: null, locality_province: null };
const saved = { ...blank, display_name: 'Ana', phone: '600 100 200' };
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
const field = (name: string) => container.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
function fill(name: string, value: string) {
  act(() => {
    const input = field(name);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => {
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

describe('ContactDetailsForm', () => {
  it('starts with four labelled optional fields and no invented defaults', () => {
    act(() => root.render(<ContactDetailsForm initial={null} />));
    expect(container.querySelectorAll('input')).toHaveLength(4);
    for (const name of Object.keys(blank)) {
      expect(field(name).value).toBe('');
      expect(field(name).required).toBe(false);
      expect(container.querySelector(`label[for="${name}"]`)).not.toBeNull();
    }
    expect(container.textContent).toContain('no cambia tu email de acceso');
    expect(container.querySelector('fieldset')?.className).toContain('sm:grid-cols-2');
  });
  it('sends only changed fields, trims input, accepts confirmed baseline and allows explicit clearing', async () => {
    act(() => root.render(<ContactDetailsForm initial={saved} />));
    fill('phone', ' +34 111 222 333 ');
    const confirmed = { ...saved, phone: '+34 111 222 333' };
    vi.mocked(saveContactDetailsAction).mockResolvedValue({ ok: true, data: confirmed });
    await submit();
    expect(saveContactDetailsAction).toHaveBeenCalledExactlyOnceWith({
      expected: saved,
      set: { phone: '+34 111 222 333' },
    });
    expect(field('phone').value).toBe(confirmed.phone);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Datos de contacto guardados.',
    );
    fill('phone', '');
    vi.mocked(saveContactDetailsAction).mockResolvedValue({
      ok: true,
      data: { ...confirmed, phone: null },
    });
    await submit();
    expect(saveContactDetailsAction).toHaveBeenLastCalledWith({
      expected: confirmed,
      set: { phone: null },
    });
  });
  it('does not save unchanged values including an out-of-limit legacy name', async () => {
    act(() =>
      root.render(
        <ContactDetailsForm initial={{ ...saved, display_name: 'Legacy '.repeat(40) }} />,
      ),
    );
    await submit();
    expect(saveContactDetailsAction).not.toHaveBeenCalled();
    fill('phone', '123');
    vi.mocked(saveContactDetailsAction).mockResolvedValue({
      ok: true,
      data: { ...saved, display_name: 'Legacy '.repeat(40), phone: '123' },
    });
    await submit();
    expect(saveContactDetailsAction).toHaveBeenCalledWith({
      expected: expect.objectContaining({ display_name: 'Legacy '.repeat(40) }),
      set: { phone: '123' },
    });
  });
  it('provides inline validation, focuses the first invalid field and never sends invalid input', async () => {
    act(() => root.render(<ContactDetailsForm initial={null} />));
    fill('contact_email', 'not-an-email');
    await submit();
    expect(saveContactDetailsAction).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field('contact_email'));
    expect(field('contact_email').getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector('#contact_email-error')?.textContent).toContain('válido');
  });
  it.each(['CONFLICT', 'UNAUTHORIZED', 'EXTERNAL_DEPENDENCY_ERROR'] as const)(
    'preserves draft and original baseline after %s without success feedback',
    async (code) => {
      act(() => root.render(<ContactDetailsForm initial={saved} />));
      fill('phone', '123');
      vi.mocked(saveContactDetailsAction).mockResolvedValue({
        ok: false,
        error: { code, message: 'Recarga para revisar los datos.' },
      });
      await submit();
      expect(field('phone').value).toBe('123');
      expect(container.querySelector('[role="status"]')).toBeNull();
      expect(document.activeElement).toBe(container.querySelector('[role="alert"]'));
      await submit();
      expect(saveContactDetailsAction).toHaveBeenLastCalledWith({
        expected: saved,
        set: { phone: '123' },
      });
    },
  );
  it('disables fields while pending and prevents duplicate submissions', async () => {
    act(() => root.render(<ContactDetailsForm initial={null} />));
    fill('phone', '123');
    let resolve!: (value: Awaited<ReturnType<typeof saveContactDetailsAction>>) => void;
    vi.mocked(saveContactDetailsAction).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await submit();
    expect(container.querySelector('fieldset')?.disabled).toBe(true);
    expect(container.querySelector('[role="status"]')).toBeNull();
    await submit();
    expect(saveContactDetailsAction).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true, data: { ...blank, phone: '123' } }));
    expect(container.querySelector('fieldset')?.disabled).toBe(false);
  });
  it('retains draft on a thrown transport failure', async () => {
    act(() => root.render(<ContactDetailsForm initial={null} />));
    fill('phone', '123');
    vi.mocked(saveContactDetailsAction).mockRejectedValue(new Error('private detail'));
    await submit();
    expect(field('phone').value).toBe('123');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Tus cambios se conservan',
    );
    expect(container.textContent).not.toContain('private detail');
  });
});
