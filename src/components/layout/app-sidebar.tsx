import { appNav } from '@/config/navigation.config';
import Link from 'next/link';

export function AppSidebar() {
  return (
    <aside className="border-r border-slate-200 bg-white p-4">
      <div className="mb-6 text-lg font-semibold text-slate-900">Brújula Civil</div>

      <nav className="flex flex-col gap-1">
        {appNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
