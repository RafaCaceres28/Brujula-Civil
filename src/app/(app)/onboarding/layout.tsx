import { requireUser } from '@/features/auth/server/require-user';
import { WizardProgress } from '@/features/wizard/components/wizard-progress';
import { getOnboardingState } from '@/features/wizard/server/get-onboarding-state';

type OnboardingLayoutProps = {
  children: React.ReactNode;
};

export default async function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
      <aside>
        <WizardProgress
          currentStepDbKey={state?.current_step ?? null}
          completionPercent={Number(state?.completion_percent ?? 0)}
        />
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
