import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  ProfileSupabaseShape,
  ProfileSummaryViewModel,
} from '@/features/profile/types/profile.types';
import {
  PROFILE_SUMMARY_FALLBACKS,
  mapDbToDomainProfile,
  mapDomainToProfileSummary,
} from '../services/profile.mapper';
import { deriveProfileSummaryVisualState, ProfileSummaryCard } from './profile-summary-card';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  if (!container) {
    return;
  }

  act(() => {
    root?.unmount();
    container?.remove();
  });
  container = null;
  root = null;
});

function renderCard({
  summary,
  state,
}: {
  summary: ProfileSummaryViewModel;
  state?: 'completo' | 'parcial' | 'vacio';
}) {
  container = document.createElement('div');
  document.body.appendChild(container);

  root = createRoot(container);

  act(() => {
    root?.render(<ProfileSummaryCard summary={summary} state={state} />);
  });
}

describe('deriveProfileSummaryVisualState', () => {
  it('returns completo when all summary fields contain meaningful values', () => {
    expect(
      deriveProfileSummaryVisualState({
        fullName: 'Ada Lovelace',
        primaryGoal: 'Operations Manager',
        location: 'Madrid',
      }),
    ).toBe('completo');
  });

  it('returns parcial when at least one summary field uses fallback', () => {
    expect(
      deriveProfileSummaryVisualState({
        fullName: 'Ada Lovelace',
        primaryGoal: PROFILE_SUMMARY_FALLBACKS.primaryGoal,
        location: 'Madrid',
      }),
    ).toBe('parcial');
  });

  it('returns vacio when all summary fields are fallback values', () => {
    expect(
      deriveProfileSummaryVisualState({
        fullName: PROFILE_SUMMARY_FALLBACKS.fullName,
        primaryGoal: PROFILE_SUMMARY_FALLBACKS.primaryGoal,
        location: PROFILE_SUMMARY_FALLBACKS.location,
      }),
    ).toBe('vacio');
  });
});

describe('ProfileSummaryCard', () => {
  it('renders accessible summary structure with labels and values', () => {
    renderCard({
      summary: {
        fullName: 'Ada Lovelace',
        primaryGoal: 'Operations Manager',
        location: 'Madrid',
      },
    });

    expect(container?.querySelector('section')).not.toBeNull();
    expect(container?.querySelector('h2')?.textContent).toBe('Resumen de perfil');

    const labels = Array.from(container?.querySelectorAll('dt') ?? []).map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(['Nombre completo', 'Objetivo principal', 'Ubicacion']);

    const values = Array.from(container?.querySelectorAll('dd') ?? []).map(
      (node) => node.textContent,
    );
    expect(values).toEqual(['Ada Lovelace', 'Operations Manager', 'Madrid']);
    expect(container?.textContent).toContain('Estado del resumen: completo.');
  });

  it('shows empty-state guidance message when state is vacio', () => {
    renderCard({
      summary: {
        fullName: PROFILE_SUMMARY_FALLBACKS.fullName,
        primaryGoal: PROFILE_SUMMARY_FALLBACKS.primaryGoal,
        location: PROFILE_SUMMARY_FALLBACKS.location,
      },
    });

    expect(container?.textContent).toContain('Estado del resumen: vacio.');
    expect(container?.textContent).toContain(
      'Aun no hay datos clave del perfil. Completa tu informacion para ver este resumen.',
    );
  });

  it('keeps visual structure coherent in parcial state compared to complete', () => {
    renderCard({
      summary: {
        fullName: 'Ada Lovelace',
        primaryGoal: 'Operations Manager',
        location: PROFILE_SUMMARY_FALLBACKS.location,
      },
    });

    const labels = Array.from(container?.querySelectorAll('dt') ?? []).map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(['Nombre completo', 'Objetivo principal', 'Ubicacion']);

    const values = Array.from(container?.querySelectorAll('dd') ?? []).map(
      (node) => node.textContent,
    );
    expect(values).toEqual([
      'Ada Lovelace',
      'Operations Manager',
      PROFILE_SUMMARY_FALLBACKS.location,
    ]);

    expect(container?.textContent).toContain('Estado del resumen: parcial.');
    expect(container?.querySelectorAll('dt')).toHaveLength(3);
    expect(container?.querySelectorAll('dd')).toHaveLength(3);
    expect(container?.textContent).not.toContain(
      'Aun no hay datos clave del perfil. Completa tu informacion para ver este resumen.',
    );
  });

  it('respects explicit visual state override from props', () => {
    renderCard({
      summary: {
        fullName: 'Ada Lovelace',
        primaryGoal: 'Operations Manager',
        location: 'Madrid',
      },
      state: 'parcial',
    });

    expect(container?.textContent).toContain('Estado del resumen: parcial.');
  });
});

describe('mapper -> summary card integration', () => {
  it('renders deterministic fallback values from mapper output', () => {
    const emptyShape: ProfileSupabaseShape = {
      app: null,
      military: null,
      civil: null,
    };

    const domain = mapDbToDomainProfile('user-empty', emptyShape);
    const summary = mapDomainToProfileSummary(domain);

    renderCard({ summary });

    expect(summary).toEqual({
      fullName: PROFILE_SUMMARY_FALLBACKS.fullName,
      primaryGoal: PROFILE_SUMMARY_FALLBACKS.primaryGoal,
      location: PROFILE_SUMMARY_FALLBACKS.location,
    });
    expect(container?.textContent).toContain('Estado del resumen: vacio.');
  });
});
