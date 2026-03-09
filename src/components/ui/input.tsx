import { cn } from '@/lib/utils/cn';
import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900',
        'placeholder:text-slate-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
        className,
      )}
      {...props}
    />
  );
}
