import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  domainFailure,
  domainSuccess,
  type DomainResult,
} from '../../../lib/contracts/domain-result';
import {
  militaryBasicsRowSchema,
  saveMilitaryBasicsSchema,
  type MilitaryBasicsRow,
} from '../schemas/military-basics.schema';

const COLUMNS = 'id, branch, rank_text, specialty_text, service_years';
const EDITABLE_COLUMNS = ['branch', 'rank_text', 'specialty_text', 'service_years'] as const;
const conflict = () =>
  domainFailure({
    code: 'CONFLICT' as const,
    message: 'El perfil ha cambiado. Recarga la página antes de volver a guardar.',
    retryable: true,
  });

export async function readMilitaryBasics(
  userId: string,
): Promise<DomainResult<MilitaryBasicsRow | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_military_profiles')
      .select(COLUMNS)
      .eq('user_id', userId)
      .eq('is_current', true)
      .maybeSingle();
    if (error) throw new Error('storage');
    if (data === null) return domainSuccess(null);
    const parsed = militaryBasicsRowSchema.safeParse(data);
    if (!parsed.success)
      return domainFailure({ code: 'INTERNAL_ERROR', message: 'El perfil militar no es válido.' });
    return domainSuccess(parsed.data);
  } catch (error) {
    unstable_rethrow(error);
    return domainFailure({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudo leer el perfil militar. Recarga la página para reintentar.',
      retryable: true,
    });
  }
}

export async function saveMilitaryBasics(
  userId: string,
  input: unknown,
): Promise<DomainResult<MilitaryBasicsRow>> {
  const parsed = saveMilitaryBasicsSchema.safeParse(input);
  if (!parsed.success)
    return domainFailure({
      code: 'VALIDATION_ERROR',
      message:
        parsed.error.issues.find((issue) => issue.path.join('.') === 'set.rank')?.message ??
        'Revisa las selecciones y los años de servicio (entero entre 0 y 60).',
    });
  const { expected, set } = parsed.data;
  const fields: Partial<Omit<MilitaryBasicsRow, 'id'>> = {};
  if (set.branch !== undefined) fields.branch = set.branch;
  if (set.rank !== undefined) fields.rank_text = set.rank.label;
  if (set.specialty !== undefined) fields.specialty_text = set.specialty.label;
  if (set.serviceYears !== undefined) fields.service_years = set.serviceYears;
  if (!Object.keys(fields).length)
    return domainFailure({ code: 'VALIDATION_ERROR', message: 'No hay cambios para guardar.' });
  try {
    const supabase = await createClient();
    // Only this editor participates in the column baseline. Legacy writers can still
    // overwrite these columns; history CAS and raw JSON remain entirely untouched.
    let result;
    if (expected) {
      let query = supabase
        .from('user_military_profiles')
        .update(fields)
        .eq('id', expected.id)
        .eq('user_id', userId)
        .eq('is_current', true);
      for (const column of EDITABLE_COLUMNS) {
        const value = expected[column];
        query = value === null ? query.is(column, null) : query.eq(column, value);
      }
      result = await query.select(COLUMNS);
    } else {
      result = await supabase
        .from('user_military_profiles')
        .insert({ user_id: userId, is_current: true, ...fields })
        .select(COLUMNS);
    }
    if (result.error?.code === '23505') return conflict();
    if (result.error) throw new Error('storage');
    if (result.data?.length !== 1) return conflict();
    const saved = militaryBasicsRowSchema.safeParse(result.data[0]);
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
