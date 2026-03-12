import { onboardingDraftSchema } from '../../wizard/schemas/wizard.schema';
import { createClient } from '@/lib/supabase/server';

function buildSourceText(draft: ReturnType<typeof onboardingDraftSchema.parse>) {
  const { militar, experiencia, competencias, objetivos } = draft;
  const primaryTargetRole = objetivos.targetRoles[0]?.label ?? null;

  return [
    militar.branch ? `Ejercito: ${militar.branch}` : null,
    militar.corps ? `Cuerpo / rama: ${militar.corps}` : null,
    militar.rank.label ? `Empleo / rango: ${militar.rank.label}` : null,
    militar.specialty.label ? `Especialidad: ${militar.specialty.label}` : null,
    militar.serviceYears != null ? `Anos de servicio: ${militar.serviceYears}` : null,
    militar.destinationContext ? `Contexto de destino: ${militar.destinationContext}` : null,
    experiencia.responsibilityAreas.length
      ? `Areas de responsabilidad: ${experiencia.responsibilityAreas.join(', ')}`
      : null,
    experiencia.missionTypes.length ? `Misiones: ${experiencia.missionTypes.join(', ')}` : null,
    experiencia.achievements.length ? `Logros: ${experiencia.achievements.join(', ')}` : null,
    experiencia.tools.length ? `Herramientas: ${experiencia.tools.join(', ')}` : null,
    competencias.technicalSkills.length
      ? `Skills técnicas: ${competencias.technicalSkills.join(', ')}`
      : null,
    competencias.softSkills.length ? `Soft skills: ${competencias.softSkills.join(', ')}` : null,
    objetivos.targetRoles.length
      ? `Roles objetivo: ${objetivos.targetRoles.map((role) => role.label).join(', ')}`
      : null,
    objetivos.targetSectors.length
      ? `Sectores objetivo: ${objetivos.targetSectors.join(', ')}`
      : null,
    primaryTargetRole ? `Rol prioritario: ${primaryTargetRole}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildCivilHeadline(draft: ReturnType<typeof onboardingDraftSchema.parse>) {
  const role = draft.objetivos.targetRoles[0]?.label ?? 'Profesional en transicion';
  const skills = [...draft.competencias.technicalSkills, ...draft.competencias.softSkills].slice(
    0,
    3,
  );

  return skills.length > 0 ? `${role} · ${skills.join(' · ')}` : role;
}

function buildCivilSummary(draft: ReturnType<typeof onboardingDraftSchema.parse>) {
  const role = draft.objetivos.targetRoles[0]?.label ?? 'un rol civil alineado con su experiencia';
  const sector = draft.objetivos.targetSectors[0] ?? 'entornos corporativos';
  const years =
    draft.militar.serviceYears != null ? `${draft.militar.serviceYears} anos de servicio` : null;
  const branch = draft.militar.corps ?? draft.militar.branch ?? 'entorno militar';
  const strengths = [...draft.competencias.softSkills, ...draft.competencias.technicalSkills].slice(
    0,
    4,
  );

  return [
    `Perfil en transición desde ${branch} hacia ${role} en ${sector}.`,
    years ? `Aporta ${years}.` : null,
    strengths.length > 0 ? `Fortalezas clave: ${strengths.join(', ')}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

export async function projectWizardToProfiles(userId: string) {
  const supabase = await createClient();

  const { data: wizardState, error: wizardStateError } = await supabase
    .from('user_wizard_state')
    .select('aggregated_draft_jsonb')
    .eq('user_id', userId)
    .maybeSingle();

  if (wizardStateError) {
    throw new Error(`Error loading wizard draft: ${wizardStateError.message}`);
  }

  const draft = onboardingDraftSchema.parse(wizardState?.aggregated_draft_jsonb ?? {});
  const sourceText = buildSourceText(draft);

  const { data: currentMilitaryProfile, error: currentMilitaryProfileError } = await supabase
    .from('user_military_profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle();

  if (currentMilitaryProfileError) {
    throw new Error(
      `Error checking current user_military_profiles: ${currentMilitaryProfileError.message}`,
    );
  }

  let militaryProfileId: string;

  if (currentMilitaryProfile) {
    const { error: updateMilitaryError } = await supabase
      .from('user_military_profiles')
      .update({
        branch: draft.militar.branch,
        component: draft.militar.corps,
        rank_text: draft.militar.rank.label,
        specialty_text: draft.militar.specialty.label,
        service_years: draft.militar.serviceYears,
        latest_unit: draft.militar.destinationContext,
        latest_role_title: draft.militar.rank.label,
        source_text: sourceText || null,
        raw_profile_jsonb: draft,
      })
      .eq('id', currentMilitaryProfile.id);

    if (updateMilitaryError) {
      throw new Error(`Error updating user_military_profiles: ${updateMilitaryError.message}`);
    }

    militaryProfileId = currentMilitaryProfile.id;
  } else {
    const { data: insertedMilitaryProfile, error: insertMilitaryError } = await supabase
      .from('user_military_profiles')
      .insert({
        user_id: userId,
        is_current: true,
        branch: draft.militar.branch,
        component: draft.militar.corps,
        rank_text: draft.militar.rank.label,
        specialty_text: draft.militar.specialty.label,
        service_years: draft.militar.serviceYears,
        latest_unit: draft.militar.destinationContext,
        latest_role_title: draft.militar.rank.label,
        source_text: sourceText || null,
        raw_profile_jsonb: draft,
      })
      .select('id')
      .single();

    if (insertMilitaryError || !insertedMilitaryProfile) {
      throw new Error(
        `Error creating user_military_profiles row: ${insertMilitaryError?.message ?? 'unknown error'}`,
      );
    }

    militaryProfileId = insertedMilitaryProfile.id;
  }

  const structuredCivilProfile = {
    target: draft.objetivos,
    skills: draft.competencias,
    experience: draft.experiencia,
    sourceMilitaryProfileId: militaryProfileId,
  };

  const civilHeadline = buildCivilHeadline(draft);
  const civilSummary = buildCivilSummary(draft);

  const { data: currentCivilProfile, error: currentCivilProfileError } = await supabase
    .from('user_civil_profiles')
    .select('id, version_no')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle();

  if (currentCivilProfileError) {
    throw new Error(
      `Error checking current user_civil_profiles: ${currentCivilProfileError.message}`,
    );
  }

  if (currentCivilProfile) {
    const { error: updateCivilError } = await supabase
      .from('user_civil_profiles')
      .update({
        military_profile_id: militaryProfileId,
        target_role: draft.objetivos.targetRoles[0]?.label ?? null,
        target_sector: draft.objetivos.targetSectors[0] ?? null,
        headline: civilHeadline,
        summary: civilSummary,
        structured_profile_jsonb: structuredCivilProfile,
        status: 'draft',
        generator_name: 'wizard',
        generator_version: '1.0.0',
        prompt_version: 'wizard-source',
      })
      .eq('id', currentCivilProfile.id);

    if (updateCivilError) {
      throw new Error(`Error updating user_civil_profiles: ${updateCivilError.message}`);
    }

    return;
  }

  const { data: latestVersions, error: latestVersionError } = await supabase
    .from('user_civil_profiles')
    .select('version_no')
    .eq('user_id', userId)
    .order('version_no', { ascending: false })
    .limit(1);

  if (latestVersionError) {
    throw new Error(`Error loading latest civil profile version: ${latestVersionError.message}`);
  }

  const nextVersion = (latestVersions?.[0]?.version_no ?? 0) + 1;

  const { error: insertCivilError } = await supabase.from('user_civil_profiles').insert({
    user_id: userId,
    military_profile_id: militaryProfileId,
    version_no: nextVersion,
    is_current: true,
    status: 'draft',
    target_role: draft.objetivos.targetRoles[0]?.label ?? null,
    target_sector: draft.objetivos.targetSectors[0] ?? null,
    headline: civilHeadline,
    summary: civilSummary,
    structured_profile_jsonb: structuredCivilProfile,
    generator_name: 'wizard',
    generator_version: '1.0.0',
    prompt_version: 'wizard-source',
  });

  if (insertCivilError) {
    throw new Error(`Error creating user_civil_profiles row: ${insertCivilError.message}`);
  }
}
