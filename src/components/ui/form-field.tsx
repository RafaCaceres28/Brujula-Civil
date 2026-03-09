import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </label>

      {children}

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
