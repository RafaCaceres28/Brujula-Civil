import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveMilitaryBasicsAction } from '../actions/save-military-basics-action';
import type { MilitaryBasicsRow } from '../schemas/military-basics.schema';
import { MilitaryBasicsForm } from './military-basics-form';

vi.mock('../actions/save-military-basics-action', () => ({ saveMilitaryBasicsAction: vi.fn() }));
let container: HTMLDivElement;
let root: Root;
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
function render(initial: MilitaryBasicsRow | null = null) {
  act(() => root.render(<MilitaryBasicsForm initial={initial} />));
}
function field(name: string) {
  return container.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
}
function select(name: string, value: string) {
  act(() => {
    field(name).value = value;
    field(name).dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => {
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}
const saved = {
  id: 'mil-1',
  branch: 'army',
  rank_text: null,
  specialty_text: null,
  service_years: null,
};

describe('MilitaryBasicsForm', () => {
  it.each([
    ['army', ['Soldado', 'Cabo', 'Cabo Primero']],
    ['navy', ['Marinero', 'Cabo', 'Cabo Primero']],
    ['air_force', ['Soldado', 'Cabo', 'Cabo Primero']],
  ])('offers only local troop ranks for %s', (branch, labels) => {
    render({ ...saved, branch });
    expect(
      Array.from((field('branch') as HTMLSelectElement).options).map((item) => item.text),
    ).toEqual(['Sin indicar', 'Ejército de Tierra', 'Armada', 'Ejército del Aire y del Espacio']);
    expect(
      Array.from((field('rank') as HTMLSelectElement).options).map((item) => item.text),
    ).toEqual(['Sin indicar', ...labels]);
  });
  it('requires a branch before offering new ranks', () => {
    render();
    expect(field('rank').disabled).toBe(true);
    expect((field('rank') as HTMLSelectElement).options).toHaveLength(1);
  });
  it('retains an incompatible rank on branch change, blocks saving and focuses rank until explicit selection', async () => {
    const initial = { ...saved, rank_text: 'Soldado' };
    render(initial);
    select('branch', 'navy');
    expect(field('rank').value).toBe('Soldado');
    expect(container.textContent).toContain('no compatible');
    await submit();
    expect(saveMilitaryBasicsAction).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field('rank'));
    expect(container.querySelector('#rank-error')?.textContent).toContain('compatible');
    select('rank', 'Marinero');
    vi.mocked(saveMilitaryBasicsAction).mockResolvedValue({
      ok: true,
      data: { ...initial, branch: 'navy', rank_text: 'Marinero' },
    });
    await submit();
    expect(saveMilitaryBasicsAction).toHaveBeenCalledExactlyOnceWith({
      expected: initial,
      set: { branch: 'navy', rank: { code: 'sailor', label: 'Marinero' } },
    });
  });
  it('displays Cabo Primero but preserves stored Cabo 1º without normalization', async () => {
    const initial = { ...saved, rank_text: 'Cabo 1º' };
    render(initial);
    expect((field('rank') as HTMLSelectElement).selectedOptions[0].text).toBe('Cabo Primero');
    expect(field('rank').value).toBe('Cabo 1º');
    field('serviceYears').value = '3';
    vi.mocked(saveMilitaryBasicsAction).mockResolvedValue({
      ok: true,
      data: { ...initial, service_years: 3 },
    });
    await submit();
    expect(saveMilitaryBasicsAction).toHaveBeenCalledExactlyOnceWith({
      expected: initial,
      set: { serviceYears: 3 },
    });
  });
  it('uses the compatible existing code and stored spelling for a new Cabo Primero selection', async () => {
    render(saved);
    select('rank', 'Cabo 1º');
    vi.mocked(saveMilitaryBasicsAction).mockResolvedValue({
      ok: true,
      data: { ...saved, rank_text: 'Cabo 1º' },
    });
    await submit();
    expect(saveMilitaryBasicsAction).toHaveBeenCalledExactlyOnceWith({
      expected: saved,
      set: { rank: { code: 'p_corporal', label: 'Cabo 1º' } },
    });
  });
  it('preserves a legacy officer while editing years and requires explicit clearing after a branch change', async () => {
    const initial = { ...saved, rank_text: 'Teniente' };
    render(initial);
    expect(field('rank').value).toBe('Teniente');
    expect(container.querySelector('#rank-legacy')?.textContent).toContain('fuera del catálogo');
    field('serviceYears').value = '2';
    const confirmed = { ...initial, service_years: 2 };
    vi.mocked(saveMilitaryBasicsAction).mockResolvedValue({ ok: true, data: confirmed });
    await submit();
    expect(saveMilitaryBasicsAction).toHaveBeenCalledExactlyOnceWith({
      expected: initial,
      set: { serviceYears: 2 },
    });
    select('branch', 'navy');
    await submit();
    expect(saveMilitaryBasicsAction).toHaveBeenCalledTimes(1);
    expect(field('rank').value).toBe('Teniente');
    select('rank', '');
    vi.mocked(saveMilitaryBasicsAction).mockResolvedValue({
      ok: true,
      data: { ...confirmed, branch: 'navy', rank_text: null },
    });
    await submit();
    expect(saveMilitaryBasicsAction).toHaveBeenLastCalledWith({
      expected: confirmed,
      set: { branch: 'navy', rank: { code: null, label: null } },
    });
  });
  it('starts blank with four labelled optional fields and no fake defaults', () => {
    render();
    expect(container.querySelectorAll('input, select')).toHaveLength(4);
    for (const name of ['branch', 'rank', 'specialty', 'serviceYears']) {
      expect(field(name).value).toBe('');
      expect(container.querySelector(`label[for="${name}"]`)).not.toBeNull();
      expect(field(name).required).toBe(false);
    }
  });
  it('keeps off-catalog values visible and sends only changed fields', async () => {
    const initial = {
      ...saved,
      branch: 'legacy',
      rank_text: 'Rango antiguo',
      specialty_text: 'Especialidad antigua',
    };
    render(initial);
    expect(field('rank').value).toBe('Rango antiguo');
    expect(container.textContent).toContain('Fuera del catálogo');
    field('serviceYears').value = '0';
    vi.mocked(saveMilitaryBasicsAction).mockResolvedValue({
      ok: true,
      data: { ...initial, service_years: 0 },
    });
    await submit();
    expect(saveMilitaryBasicsAction).toHaveBeenCalledExactlyOnceWith({
      expected: initial,
      set: { serviceYears: 0 },
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain('guardado');
  });
  it('uses confirmed baseline on the next edit and converts labels to existing catalog pairs', async () => {
    render();
    select('branch', 'army');
    vi.mocked(saveMilitaryBasicsAction).mockResolvedValue({ ok: true, data: saved });
    await submit();
    select('rank', 'Soldado');
    expect(container.querySelector('[role="status"]')).toBeNull();
    await submit();
    expect(saveMilitaryBasicsAction).toHaveBeenLastCalledWith({
      expected: saved,
      set: { rank: { code: 'soldier', label: 'Soldado' } },
    });
  });
  it('does not silently normalize legacy empty strings while editing years', async () => {
    const initial = { ...saved, branch: '', rank_text: '', specialty_text: '' };
    render(initial);
    field('serviceYears').value = '2';
    vi.mocked(saveMilitaryBasicsAction).mockResolvedValue({
      ok: true,
      data: { ...initial, service_years: 2 },
    });
    await submit();
    expect(saveMilitaryBasicsAction).toHaveBeenCalledExactlyOnceWith({
      expected: initial,
      set: { serviceYears: 2 },
    });
  });
  it('sends an explicit clear and preserves the draft on network failure', async () => {
    render({ ...saved, rank_text: 'Soldado', service_years: 0 });
    select('rank', '');
    field('serviceYears').value = '';
    vi.mocked(saveMilitaryBasicsAction).mockRejectedValue(new Error('network'));
    await submit();
    expect(saveMilitaryBasicsAction).toHaveBeenCalledWith({
      expected: { ...saved, rank_text: 'Soldado', service_years: 0 },
      set: { rank: { code: null, label: null }, serviceYears: null },
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('borrador');
    expect(field('rank').value).toBe('');
  });
  it('preserves draft and focuses the conflict error without claiming success', async () => {
    render();
    select('branch', 'army');
    vi.mocked(saveMilitaryBasicsAction).mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: 'Recarga la página.' },
    });
    await submit();
    expect(field('branch').value).toBe('army');
    expect(document.activeElement).toBe(container.querySelector('[role="alert"]'));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
  it('disables edits while waiting and only confirms server success', async () => {
    render();
    select('branch', 'army');
    let resolve!: (value: Awaited<ReturnType<typeof saveMilitaryBasicsAction>>) => void;
    vi.mocked(saveMilitaryBasicsAction).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await submit();
    expect(container.querySelector('fieldset')?.disabled).toBe(true);
    expect(container.querySelector('[role="status"]')).toBeNull();
    await act(async () => resolve({ ok: true, data: saved }));
    expect(container.querySelector('fieldset')?.disabled).toBe(false);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
  it('rejects fractional and out-of-range years before sending', async () => {
    render();
    for (const value of ['-1', '61', '1.5']) {
      field('serviceYears').value = value;
      await submit();
    }
    expect(saveMilitaryBasicsAction).not.toHaveBeenCalled();
  });
});
