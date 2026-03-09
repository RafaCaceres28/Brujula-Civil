import { cn } from '@/lib/utils/cn';
import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, rows = 5, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'flex min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900',
        'placeholder:text-slate-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
        className,
      )}
      {...props}
    />
  );
}
