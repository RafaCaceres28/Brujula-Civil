import { requireUser } from '@/features/auth/server/require-user';
import { WizardProgress } from '@/features/wizard/components/wizard-progress';
import { getOnboardingOverview } from '@/features/wizard/server/get-onboarding-overview';

type OnboardingLayoutProps = {
  children: React.ReactNode;
};

export default async function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const user = await requireUser();
  const overview = await getOnboardingOverview(user.id);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
      <aside>
        <WizardProgress
          currentStepDbKey={overview.state?.current_step ?? null}
          completionPercent={Number(overview.state?.completion_percent ?? 0)}
          completedStepKeys={overview.completedStepKeys}
        />
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
