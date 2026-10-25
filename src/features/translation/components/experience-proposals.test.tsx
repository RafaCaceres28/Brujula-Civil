import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StructuredExperience } from '../schemas/structured-experience.schema';
import { buildExperienceProposals } from '../services/experience-proposals.builder';
import { competencyEvidenceKey } from '../services/competency-review';
import { ExperienceProposals } from './experience-proposals';

const mocks = vi.hoisted(() => ({ edit: vi.fn() }));
vi.mock('@/features/profile/actions/save-experience-action', () => ({
  editExperienceAction: mocks.edit,
}));
let container: HTMLDivElement;
let root: Root;
const initial: StructuredExperience = {
  id: 'experience-1',
  activity: 'instruction',
  stageIds: ['stage-1'],
  instructionActivities: ['demonstrated', 'explained_to_peers'],
};
const proposals = buildExperienceProposals([initial]);
function setup(experience = initial) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <ExperienceProposals experiences={[experience]} proposals={proposals} hasExperiences />,
    ),
  );
}
function button(label: string, index = 0) {
  return Array.from(container.querySelectorAll('button')).filter(
    (entry) => entry.textContent === label,
  )[index]!;
}
function click(label: string, index = 0) {
  act(() => button(label, index).click());
}
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.resetAllMocks();
});

describe('competency decisions', () => {
  it('waits for server confirmation, serializes same-experience decisions and uses returned baselines without modifying source', async () => {
    setup();
    let resolve!: (value: unknown) => void;
    mocks.edit.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    click('Aceptar');
    click('Descartar', 1);
    expect(mocks.edit).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain('Aceptada por ti');
    expect(
      Array.from(container.querySelectorAll('fieldset')).every((entry) => entry.disabled),
    ).toBe(true);
    const accepted = {
      ...initial,
      competencyReviews: [
        {
          competencyId: proposals[0].civilianCompetencyCandidate.id,
          evidenceKey: competencyEvidenceKey(proposals[0].civilianCompetencyCandidate),
          decision: 'accepted' as const,
        },
      ],
    };
    expect(mocks.edit).toHaveBeenLastCalledWith({
      id: initial.id,
      expectedExperience: initial,
      set: { competencyReviews: accepted.competencyReviews },
      clear: [],
    });
    await act(async () => resolve({ ok: true, data: { experience: accepted } }));
    expect(container.textContent).toContain('Aceptada por ti');
    expect(button('Aceptar').getAttribute('aria-pressed')).toBe('true');
    mocks.edit.mockImplementation(async ({ expectedExperience, set }) => ({
      ok: true,
      data: { experience: { ...expectedExperience, ...set } },
    }));
    await act(async () => click('Descartar', 1));
    expect(mocks.edit.mock.calls[1][0].expectedExperience).toEqual(accepted);
    expect(mocks.edit.mock.calls[1][0].set.competencyReviews[0]).toEqual(
      accepted.competencyReviews[0],
    );
    expect(container.textContent).toContain('Descartada por ti');
    expect(container.textContent).toContain(proposals[0].cvDescription.text);
    expect(container.textContent).toContain('ni la añade a un CV');
  });

  it('reloads a decision, changes it and returns to pending only after success', async () => {
    const candidate = proposals[0].civilianCompetencyCandidate;
    const accepted = {
      ...initial,
      competencyReviews: [
        {
          competencyId: candidate.id,
          evidenceKey: competencyEvidenceKey(candidate),
          decision: 'accepted' as const,
        },
      ],
    };
    setup(accepted);
    expect(container.textContent).toContain('Aceptada por ti');
    mocks.edit.mockImplementation(async ({ expectedExperience, set, clear }) => {
      const experience = { ...expectedExperience, ...set };
      for (const field of clear) delete experience[field];
      return { ok: true, data: { experience } };
    });
    await act(async () => click('Descartar'));
    expect(container.textContent).toContain('Descartada por ti');
    await act(async () => click('Volver a pendiente'));
    expect(mocks.edit.mock.calls[1][0]).toMatchObject({ set: {}, clear: ['competencyReviews'] });
    expect(container.textContent).not.toMatch(/Aceptada por ti|Descartada por ti/);
  });

  it.each(['CONFLICT', 'UNAUTHORIZED', 'VALIDATION_ERROR', 'EXTERNAL_DEPENDENCY_ERROR', 'throw'])(
    'preserves pending state on %s and retries with unchanged baseline',
    async (code) => {
      setup();
      if (code === 'throw') mocks.edit.mockRejectedValue(new Error('network'));
      else mocks.edit.mockResolvedValue({ ok: false, error: { code, message: 'Error de prueba' } });
      await act(async () => click('Aceptar'));
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(container.textContent).not.toMatch(/Aceptada por ti|Descartada por ti/);
      if (code === 'CONFLICT') expect(container.textContent).toContain('Recarga');
      await act(async () => click('Descartar'));
      expect(mocks.edit.mock.calls[1][0].expectedExperience).toEqual(initial);
    },
  );

  it('keeps an accepted decision on failed change and resets to the new evidence on a server snapshot', async () => {
    const candidate = proposals[0].civilianCompetencyCandidate;
    const accepted = {
      ...initial,
      competencyReviews: [
        {
          competencyId: candidate.id,
          evidenceKey: competencyEvidenceKey(candidate),
          decision: 'accepted' as const,
        },
      ],
    };
    setup(accepted);
    mocks.edit.mockResolvedValue({ ok: false, error: { code: 'CONFLICT', message: 'Conflict' } });
    await act(async () => click('Descartar'));
    expect(container.textContent).toContain('Aceptada por ti');
    expect(container.textContent).not.toContain('Descartada por ti');
    const changed: StructuredExperience = {
      ...initial,
      instructionActivities: ['prepared_and_delivered'],
    };
    act(() =>
      root.render(
        <ExperienceProposals
          experiences={[changed]}
          proposals={buildExperienceProposals([changed])}
          hasExperiences
        />,
      ),
    );
    expect(container.textContent).toContain('Pendiente de revisión');
    expect(container.textContent).not.toMatch(/Aceptada por ti|Descartada por ti|Recarga/);
    expect(container.querySelector('button[aria-pressed="true"]')).toBeNull();
  });
});
