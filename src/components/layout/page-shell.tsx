import { cn } from '@/lib/utils/cn';

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return <div className={cn('space-y-6', className)}>{children}</div>;
}
