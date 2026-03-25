import { FormField } from '@/components/ui/form-field';
import type { CatalogOption } from '../config/wizard-catalogs';

type CatalogMultiSelectProps = {
  name: string;
  label: string;
  options: CatalogOption[];
  selectedValues?: string[];
  hint?: string;
};

export function CatalogMultiSelect({
  name,
  label,
  options,
  selectedValues = [],
  hint,
}: CatalogMultiSelectProps) {
  const selectedSet = new Set(selectedValues);

  return (
    <FormField label={label} hint={hint}>
      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selectedSet.has(option.value)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </FormField>
  );
}
