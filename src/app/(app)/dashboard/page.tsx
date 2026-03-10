import { requireUser } from '@/features/auth/server/require-user';
import { resetOnboardingAction } from '@/features/wizard/actions/reset-onboarding-action';
import { getOnboardingState } from '@/features/wizard/server/get-onboarding-state';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);

  const isCompleted = state?.is_completed ?? false;
  const completionPercent = Number(state?.completion_percent ?? 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>

        <p className="mt-2 text-slate-600">
          Estado actual del onboarding: {isCompleted ? 'Completado' : 'En progreso'} (
          {completionPercent}%)
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/onboarding"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span> {isCompleted ? 'Revisar onboarding' : 'Continuar onboarding'} </span>
          </Link>

          <form action={resetOnboardingAction}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm"
              style={{ color: '#ffffff' }}
            >
              <span style={{ color: '#ffffff' }}>Reset onboarding</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
