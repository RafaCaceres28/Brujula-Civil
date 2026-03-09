import { appNav } from '@/config/navigation.config';
import Link from 'next/link';

export function AppSidebar() {
  return (
    <aside className="border-r bg-white p-4">
      <div className="mb-6 text-lg font-semibold">Brújula Civil</div>

      <nav className="flex flex-col gap-2">
        {appNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
