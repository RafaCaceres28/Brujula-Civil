import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  domainFailure,
  domainSuccess,
  type DomainResult,
} from '../../../lib/contracts/domain-result';
import {
  academicEducationSchema,
  saveAcademicEducationSchema,
  type AcademicEducation,
} from '../schemas/academic-education.schema';

const COLUMNS = 'user_id, academic_education_jsonb';
const integrity = () =>
  domainFailure({
    code: 'INTERNAL_ERROR' as const,
    message:
      'No se pudo comprobar la formación guardada. Recarga; si persiste, contacta con soporte.',
  });
const conflict = () =>
  domainFailure({
    code: 'CONFLICT' as const,
    message: 'La formación ha cambiado. Recarga para revisar los datos antes de volver a guardar.',
    retryable: true,
  });

export async function readAcademicEducation(
  userId: string,
): Promise<DomainResult<AcademicEducation | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('app_user_profiles')
      .select(COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error('storage');
    if (data === null) return domainSuccess(null);
    const parsed = academicEducationSchema.nullable().safeParse(data.academic_education_jsonb);
    return parsed.success ? domainSuccess(parsed.data) : integrity();
  } catch (error) {
    unstable_rethrow(error);
    return domainFailure({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudo leer tu formación. Recarga la página para reintentar.',
      retryable: true,
    });
  }
}

export async function saveAcademicEducation(
  userId: string,
  input: unknown,
): Promise<DomainResult<AcademicEducation>> {
  const parsed = saveAcademicEducationSchema.safeParse(input);
  if (!parsed.success)
    return domainFailure({
      code: 'VALIDATION_ERROR',
      message: parsed.error.issues[0]?.message ?? 'Revisa tus estudios.',
    });
  const { expected, academicEducation } = parsed.data;
  try {
    const supabase = await createClient();
    const current = await supabase
      .from('app_user_profiles')
      .select(COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();
    if (current.error) throw new Error('storage');
    const raw = current.data === null ? null : current.data.academic_education_jsonb;
    const stored = academicEducationSchema.nullable().safeParse(raw);
    if (!stored.success) return integrity();
    if (JSON.stringify(stored.data) !== JSON.stringify(expected)) return conflict();
    let result;
    if (current.data === null) {
      result = await supabase
        .from('app_user_profiles')
        .insert({ user_id: userId, academic_education_jsonb: academicEducation })
        .select('academic_education_jsonb');
    } else {
      // Compare the original JSON, not its normalized view; unrelated columns are never rewritten.
      let query = supabase
        .from('app_user_profiles')
        .update({ academic_education_jsonb: academicEducation })
        .eq('user_id', userId);
      query =
        raw === null
          ? query.is('academic_education_jsonb', null)
          : query.eq('academic_education_jsonb', JSON.stringify(raw));
      result = await query.select('academic_education_jsonb');
    }
    if (result.error?.code === '23505') return conflict();
    if (result.error) throw new Error('storage');
    if (result.data?.length !== 1) return conflict();
    const saved = academicEducationSchema.safeParse(result.data[0].academic_education_jsonb);
    if (!saved.success) throw new Error('invalid response');
    return domainSuccess(saved.data);
  } catch (error) {
    unstable_rethrow(error);
    return domainFailure({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudo confirmar el guardado. Tus cambios se conservan en el formulario.',
      retryable: true,
    });
  }
}
