import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { UserWizardStateRow } from '@/types/database.types';
import { WIZARD_STEPS } from '../config/wizard-steps';
import { StepGuard } from './step-guard';

vi.mock('next/navigation', () => ({
  redirect: (href: string) => {
    throw new Error(`REDIRECT:${href}`);
  },
}));
const state = (current_step: string, is_completed = false) =>
  ({ current_step, is_completed }) as UserWizardStateRow;
const render = (slug: (typeof WIZARD_STEPS)[number]['slug'], current: string, completed = false) =>
  renderToString(
    <StepGuard requestedStepSlug={slug} wizardState={state(current, completed)}>
      Allowed
    </StepGuard>,
  );

describe('StepGuard local experience access', () => {
  it.each(WIZARD_STEPS.map((step) => step.dbKey))(
    'permite recuperar experiencia y volver a militar desde %s',
    (key) => {
      expect(render('experiencia', key)).toBe('Allowed');
      expect(render('militar', key)).toBe('Allowed');
    },
  );
  it.each(['completed', 'review'])(
    'permite experiencia completada sin abrir los otros pasos: %s',
    (key) => {
      expect(render('experiencia', key, true)).toBe('Allowed');
      for (const step of WIZARD_STEPS.filter((item) => item.slug !== 'experiencia')) {
        expect(() => render(step.slug, key, true)).toThrow('REDIRECT:/dashboard');
      }
    },
  );
  it('no cambia restricciones de otros pasos incompletos', () => {
    expect(() => render('competencias', 'preferences')).toThrow('REDIRECT:/onboarding/objetivos');
    expect(render('objetivos', 'military_background')).toBe('Allowed');
  });
});
