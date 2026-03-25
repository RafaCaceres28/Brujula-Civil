import { FormField } from '@/components/ui/form-field';
import type { CatalogOption } from '../config/wizard-catalogs';

type CatalogChoiceGroupProps = {
  name: string;
  label: string;
  options: CatalogOption[];
  type: 'radio' | 'checkbox';
  selectedValue?: string | null;
  selectedValues?: string[];
  hint?: string;
};

export function CatalogChoiceGroup({
  name,
  label,
  options,
  type,
  selectedValue,
  selectedValues = [],
  hint,
}: CatalogChoiceGroupProps) {
  const selectedSet = new Set(selectedValues);

  return (
    <FormField label={label} hint={hint}>
      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
        {options.map((option) => {
          const defaultChecked =
            type === 'radio' ? selectedValue === option.value : selectedSet.has(option.value);

          return (
            <label key={option.value} className="flex items-start gap-2 text-sm text-slate-800">
              <input
                type={type}
                name={name}
                value={option.value}
                defaultChecked={defaultChecked}
                className="mt-0.5 h-4 w-4 border-slate-300 text-slate-900"
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </FormField>
  );
}
