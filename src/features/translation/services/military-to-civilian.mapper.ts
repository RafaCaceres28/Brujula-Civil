import type { z } from 'zod';
import type { onboardingDraftSchema } from '@/features/wizard/schemas/wizard.schema';
import type { StructuredExperience } from '../schemas/structured-experience.schema';

type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export type MilitaryToCivilianInput = {
  [Step in keyof OnboardingDraft]?: Partial<OnboardingDraft[Step]>;
} & {
  structuredExperiences?: StructuredExperience[];
};

export type MilitaryToCivilianEvidence =
  | { field: 'experiencia.tools'; value: 'radio_comms' }
  | { field: 'experiencia.functionTypes'; value: 'op_maintenance' }
  | {
      experienceId: string;
      field: 'structuredExperiences.activity';
      value: 'op_maintenance';
    }
  | {
      experienceId: string;
      field: 'structuredExperiences.equipment';
      value: 'radio_comms';
    };

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
  | {
      id: 'radio-equipment-maintenance';
      basis: 'direct_declaration';
      evidence: [
        Extract<MilitaryToCivilianEvidence, { field: 'structuredExperiences.activity' }>,
        Extract<MilitaryToCivilianEvidence, { field: 'structuredExperiences.equipment' }>,
      ];
    }
);

export function mapMilitaryToCivilianCompetencies(
  input: MilitaryToCivilianInput,
): CivilianCompetencyCandidate[] {
  const candidates: CivilianCompetencyCandidate[] = [];
  const hasDeclaredRadio = input.experiencia?.tools?.includes('radio_comms');

  if (hasDeclaredRadio) {
    candidates.push({
      id: 'radio-equipment-usage',
      label: 'Uso de equipos de radiocomunicaciones',
      basis: 'direct_declaration',
      requiresReview: true,
      evidence: [{ field: 'experiencia.tools', value: 'radio_comms' }],
    });
  }

  // Use a stable id, not array position, to select one sufficient explicit declaration.
  let explicitMaintenance: StructuredExperience | undefined;
  for (const experience of input.structuredExperiences ?? []) {
    if (
      experience.activity === 'op_maintenance' &&
      experience.equipment === 'radio_comms' &&
      (!explicitMaintenance || experience.id < explicitMaintenance.id)
    ) {
      explicitMaintenance = experience;
    }
  }

  if (explicitMaintenance) {
    candidates.push({
      id: 'radio-equipment-maintenance',
      label: 'Mantenimiento de equipos de radiocomunicaciones',
      basis: 'direct_declaration',
      requiresReview: true,
      evidence: [
        {
          experienceId: explicitMaintenance.id,
          field: 'structuredExperiences.activity',
          value: 'op_maintenance',
        },
        {
          experienceId: explicitMaintenance.id,
          field: 'structuredExperiences.equipment',
          value: 'radio_comms',
        },
      ],
    });
  } else if (hasDeclaredRadio && input.experiencia?.functionTypes?.includes('op_maintenance')) {
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
