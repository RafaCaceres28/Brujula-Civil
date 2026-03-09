import { cn } from '@/lib/utils/cn';
import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type CardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

type CardContentProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}
