import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  domainFailure,
  domainSuccess,
  type DomainResult,
} from '../../../lib/contracts/domain-result';
import {
  contactDetailsRowSchema,
  saveContactDetailsSchema,
  type ContactDetailsRow,
} from '../schemas/contact-details.schema';

const COLUMNS = 'display_name, phone, contact_email, locality_province';
const EDITABLE_COLUMNS = ['display_name', 'phone', 'contact_email', 'locality_province'] as const;
const conflict = () =>
  domainFailure({
    code: 'CONFLICT' as const,
    message:
      'Tus datos de contacto han cambiado. Recarga para revisar los datos antes de volver a guardar.',
    retryable: true,
  });

export async function readContactDetails(
  userId: string,
): Promise<DomainResult<ContactDetailsRow | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('app_user_profiles')
      .select(COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error('storage');
    if (data === null) return domainSuccess(null);
    const parsed = contactDetailsRowSchema.safeParse(data);
    if (!parsed.success)
      return domainFailure({
        code: 'INTERNAL_ERROR',
        message: 'No se pudieron comprobar tus datos de contacto.',
      });
    return domainSuccess(parsed.data);
  } catch (error) {
    unstable_rethrow(error);
    return domainFailure({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudieron leer tus datos de contacto. Recarga la página para reintentar.',
      retryable: true,
    });
  }
}

export async function saveContactDetails(
  userId: string,
  input: unknown,
): Promise<DomainResult<ContactDetailsRow>> {
  const parsed = saveContactDetailsSchema.safeParse(input);
  if (!parsed.success)
    return domainFailure({
      code: 'VALIDATION_ERROR',
      message: parsed.error.issues[0]?.message ?? 'Revisa tus datos de contacto.',
    });
  const { expected, set } = parsed.data;
  const fields: Partial<ContactDetailsRow> = {};
  for (const column of EDITABLE_COLUMNS) {
    if (set[column] !== undefined && set[column] !== (expected?.[column] ?? null))
      fields[column] = set[column];
  }
  if (!Object.keys(fields).length)
    return domainFailure({ code: 'VALIDATION_ERROR', message: 'No hay cambios para guardar.' });
  try {
    const supabase = await createClient();
    let result;
    if (expected) {
      // Column CAS protects this editor, not subsequent writes by legacy profile editors.
      let query = supabase.from('app_user_profiles').update(fields).eq('user_id', userId);
      for (const column of EDITABLE_COLUMNS) {
        const value = expected[column];
        query = value === null ? query.is(column, null) : query.eq(column, value);
      }
      result = await query.select(COLUMNS);
    } else {
      result = await supabase
        .from('app_user_profiles')
        .insert({ user_id: userId, ...fields })
        .select(COLUMNS);
    }
    if (result.error?.code === '23505') return conflict();
    if (result.error) throw new Error('storage');
    if (result.data?.length !== 1) return conflict();
    const saved = contactDetailsRowSchema.safeParse(result.data[0]);
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
