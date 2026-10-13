import type { z } from 'zod';
import type { onboardingDraftSchema } from '@/features/wizard/schemas/wizard.schema';

type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export type MilitaryToCivilianInput = {
  [Step in keyof OnboardingDraft]?: Partial<OnboardingDraft[Step]>;
};

export type MilitaryToCivilianEvidence =
  | { field: 'experiencia.tools'; value: 'radio_comms' }
  | { field: 'experiencia.functionTypes'; value: 'op_maintenance' };

export type CivilianCompetencyCandidate = {
  label: string;
  requiresReview: true;
} & (
  | {
      id: 'radio-equipment-usage';
      basis: 'direct_declaration';
      evidence: [Extract<MilitaryToCivilianEvidence, { field: 'experiencia.tools' }>];
    }
  | {
      id: 'radio-equipment-maintenance';
      basis: 'inference';
      evidence: [
        Extract<MilitaryToCivilianEvidence, { field: 'experiencia.tools' }>,
        Extract<MilitaryToCivilianEvidence, { field: 'experiencia.functionTypes' }>,
      ];
    }
);

export function mapMilitaryToCivilianCompetencies(
  input: MilitaryToCivilianInput,
): CivilianCompetencyCandidate[] {
  if (!input.experiencia?.tools?.includes('radio_comms')) {
    return [];
  }

  const candidates: CivilianCompetencyCandidate[] = [
    {
      id: 'radio-equipment-usage',
      label: 'Uso de equipos de radiocomunicaciones',
      basis: 'direct_declaration',
      requiresReview: true,
      evidence: [{ field: 'experiencia.tools', value: 'radio_comms' }],
    },
  ];

  if (input.experiencia.functionTypes?.includes('op_maintenance')) {
    // These selections do not establish that maintenance was performed on the radio equipment.
    candidates.push({
      id: 'radio-equipment-maintenance',
      label: 'Mantenimiento de equipos de radiocomunicaciones',
      basis: 'inference',
      requiresReview: true,
      evidence: [
        { field: 'experiencia.tools', value: 'radio_comms' },
        { field: 'experiencia.functionTypes', value: 'op_maintenance' },
      ],
    });
  }

  return candidates;
}
