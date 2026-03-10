import { createClient } from '@/lib/supabase/server';

type AggregatedDraft = {
  militar?: {
    army?: string | null;
    cuerpo?: string | null;
    rank?: string | null;
    specialty?: string | null;
    yearsOfService?: number | null;
    destinationType?: string | null;
  };
  experiencia?: {
    responsibilities?: string[];
    missions?: string[];
    achievements?: string[];
    tools?: string[];
  };
  competencias?: {
    technicalSkills?: string[];
    softSkills?: string[];
    certifications?: string[];
    languages?: string[];
  };
  objetivos?: {
    targetRoles?: string[];
    targetSectors?: string[];
    preferredLocations?: string[];
    workModel?: 'onsite' | 'hybrid' | 'remote' | null;
  };
};

export async function projectWizardToMilitaryProfile(userId: string) {
  const supabase = await createClient();

  const { data: wizardState, error: wizardStateError } = await supabase
    .from('user_wizard_state')
    .select('aggregated_draft_jsonb')
    .eq('user_id', userId)
    .maybeSingle();

  if (wizardStateError) {
    throw new Error(`Error loading wizard aggregated draft: ${wizardStateError.message}`);
  }

  const draft = (wizardState?.aggregated_draft_jsonb ?? {}) as AggregatedDraft;

  const militar = draft.militar ?? {};
  const experiencia = draft.experiencia ?? {};
  const competencias = draft.competencias ?? {};
  const objetivos = draft.objetivos ?? {};

  const rawProfileJson = {
    militar,
    experiencia,
    competencias,
    objetivos,
  };

  const sourceTextParts = [
    militar.army ? `Ejército: ${militar.army}` : null,
    militar.cuerpo ? `Rama: ${militar.cuerpo}` : null,
    militar.rank ? `Rango: ${militar.rank}` : null,
    militar.specialty ? `Especialidad: ${militar.specialty}` : null,
    militar.yearsOfService != null ? `Años de servicio: ${militar.yearsOfService}` : null,
    experiencia.responsibilities?.length
      ? `Responsabilidades: ${experiencia.responsibilities.join(', ')}`
      : null,
    experiencia.missions?.length ? `Misiones: ${experiencia.missions.join(', ')}` : null,
    experiencia.achievements?.length ? `Logros: ${experiencia.achievements.join(', ')}` : null,
    competencias.technicalSkills?.length
      ? `Competencias técnicas: ${competencias.technicalSkills.join(', ')}`
      : null,
    competencias.softSkills?.length
      ? `Competencias transversales: ${competencias.softSkills.join(', ')}`
      : null,
  ].filter(Boolean);

  const sourceText = sourceTextParts.join('\n');

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from('user_military_profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle();

  if (currentProfileError) {
    throw new Error(
      `Error checking current user_military_profiles: ${currentProfileError.message}`,
    );
  }

  if (currentProfile) {
    const { error: updateError } = await supabase
      .from('user_military_profiles')
      .update({
        branch: militar.cuerpo ?? null,
        component: militar.army ?? null,
        rank_text: militar.rank ?? null,
        specialty_text: militar.specialty ?? null,
        service_years: militar.yearsOfService ?? null,
        latest_unit: militar.destinationType ?? null,
        latest_role_title: militar.rank ?? null,
        source_text: sourceText || null,
        raw_profile_jsonb: rawProfileJson,
      })
      .eq('id', currentProfile.id);

    if (updateError) {
      throw new Error(`Error updating user_military_profiles: ${updateError.message}`);
    }

    return;
  }

  const { error: insertError } = await supabase.from('user_military_profiles').insert({
    user_id: userId,
    is_current: true,
    branch: militar.cuerpo ?? null,
    component: militar.army ?? null,
    rank_text: militar.rank ?? null,
    specialty_text: militar.specialty ?? null,
    service_years: militar.yearsOfService ?? null,
    latest_unit: militar.destinationType ?? null,
    latest_role_title: militar.rank ?? null,
    source_text: sourceText || null,
    raw_profile_jsonb: rawProfileJson,
  });

  if (insertError) {
    throw new Error(`Error creating user_military_profiles: ${insertError.message}`);
  }
}
