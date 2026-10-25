import { isDeepStrictEqual } from 'node:util';
import { ZodError } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createDomainError, isDomainError } from '../../../lib/contracts/domain-error';
import {
  domainFailure,
  domainSuccess,
  type DomainResult,
} from '../../../lib/contracts/domain-result';
import {
  structuredExperienceSchema,
  type StructuredExperience,
} from '../../translation/schemas/structured-experience.schema';
import {
  careerHistorySchema,
  type CareerHistory,
} from '../../translation/schemas/career-history.schema';
import {
  experienceFieldsSchema,
  saveExperienceCommandSchema,
} from '../schemas/save-experience.schema';
import { militaryProfileJsonSchema } from '../services/profile-json';
import { updateMilitarySnapshot } from './update-military-snapshot';
import { buildExperienceProposals } from '../../translation/services/experience-proposals.builder';
import { competencyEvidenceKey } from '../../translation/services/competency-review';

export async function saveExperience(
  userId: string,
  input: unknown,
): Promise<DomainResult<{ experience: StructuredExperience }>> {
  const parsed = saveExperienceCommandSchema.safeParse(input);
  if (!parsed.success) {
    return domainFailure(
      createDomainError({ code: 'VALIDATION_ERROR', message: 'Comando de experiencia invalido' }),
    );
  }
  const command = parsed.data;
  try {
    const supabase = await createClient();
    // Only an insert collision is retried, always re-reading and recomposing the command.
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: current, error } = await supabase
        .from('user_military_profiles')
        .select('id, raw_profile_jsonb')
        .eq('user_id', userId)
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw new Error('storage');
      const original = (current?.raw_profile_jsonb ?? {}) as Record<string, unknown>;
      const canonical = militaryProfileJsonSchema.parse(current ? current.raw_profile_jsonb : {});
      const id = command.operation === 'create' ? command.experience.id : command.id;
      const index =
        canonical.careerHistory?.experiences.findIndex((experience) => experience.id === id) ?? -1;
      const existing = canonical.careerHistory?.experiences[index];
      if (command.operation === 'create' && existing) {
        const declared = { id: existing.id, ...experienceFieldsSchema.strip().parse(existing) };
        if (!isDeepStrictEqual(declared, command.experience)) {
          return domainFailure(
            createDomainError({
              code: 'CONFLICT',
              message: 'El identificador ya tiene otra experiencia',
            }),
          );
        }
        return domainSuccess({ experience: existing });
      }
      if (command.operation === 'edit' && !existing) {
        return domainFailure(
          createDomainError({ code: 'NOT_FOUND', message: 'La experiencia no existe' }),
        );
      }
      if (
        command.operation === 'edit' &&
        !isDeepStrictEqual(existing, command.expectedExperience)
      ) {
        return domainFailure(
          createDomainError({
            code: 'CONFLICT',
            message: 'La experiencia ha cambiado; recarga antes de editar',
          }),
        );
      }
      const originalHistory = original.careerHistory as CareerHistory | undefined;
      const experiences = [...(originalHistory?.experiences ?? [])];
      if (command.operation === 'create') {
        experiences.push(command.experience);
      } else {
        const edited = { ...experiences[index], ...command.set };
        command.clear.forEach((field) => delete edited[field]);
        if (edited.competencyReviews?.length) {
          const candidates = buildExperienceProposals([structuredExperienceSchema.parse(edited)]);
          const matches = (
            review: NonNullable<StructuredExperience['competencyReviews']>[number],
          ) =>
            candidates.some(
              ({ civilianCompetencyCandidate: candidate }) =>
                candidate.id === review.competencyId &&
                competencyEvidenceKey(candidate) === review.evidenceKey,
            );
          // Explicit decisions must bind to current source evidence. Source edits retire
          // obsolete decisions, preventing an old acceptance from reviving on a later revert.
          if (command.set.competencyReviews?.some((review) => !matches(review))) {
            return domainFailure(
              createDomainError({
                code: 'VALIDATION_ERROR',
                message: 'La competencia o su evidencia no coincide con la experiencia actual',
              }),
            );
          }
          const reviews = edited.competencyReviews.filter(matches);
          if (reviews.length) edited.competencyReviews = reviews;
          else delete edited.competencyReviews;
        }
        experiences[index] = edited;
      }
      const history = { ...originalHistory, experiences };
      careerHistorySchema.parse(history);
      const saved = structuredExperienceSchema.parse(
        experiences[command.operation === 'create' ? experiences.length - 1 : index],
      );
      const raw = { ...original, careerHistory: history };
      if (current) {
        await updateMilitarySnapshot(supabase, userId, current, { raw_profile_jsonb: raw });
      } else {
        const inserted = await supabase
          .from('user_military_profiles')
          .insert({ user_id: userId, is_current: true, raw_profile_jsonb: raw })
          .select('id')
          .single();
        if (inserted.error?.code === '23505') {
          if (attempt === 0) continue;
          return domainFailure(
            createDomainError({
              code: 'CONFLICT',
              message: 'El perfil ha cambiado; vuelve a intentar',
            }),
          );
        }
        if (inserted.error || !inserted.data) throw new Error('storage');
      }
      return domainSuccess({ experience: saved });
    }
  } catch (error) {
    if (isDomainError(error)) return domainFailure(error);
    if (error instanceof ZodError) {
      return domainFailure(
        createDomainError({
          code: 'VALIDATION_ERROR',
          message: 'El historial almacenado no es valido',
        }),
      );
    }
  }
  return domainFailure(
    createDomainError({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudo guardar la experiencia',
      retryable: true,
    }),
  );
}
