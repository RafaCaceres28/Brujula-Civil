import { FormField } from '@/components/ui/form-field';
import type { CatalogOption } from '../config/wizard-catalogs';

type CatalogSingleSelectProps = {
  id: string;
  name: string;
  label: string;
  options: CatalogOption[];
  defaultValue?: string | null;
  placeholder?: string;
  hint?: string;
  required?: boolean;
};

export function CatalogSingleSelect({
  id,
  name,
  label,
  options,
  defaultValue,
  placeholder = 'Selecciona una opcion',
  hint,
  required = false,
}: CatalogSingleSelectProps) {
  return (
    <FormField label={label} htmlFor={id} hint={hint} required={required}>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ''}
        className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
