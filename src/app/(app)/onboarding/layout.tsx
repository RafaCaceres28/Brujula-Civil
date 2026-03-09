type OnboardingLayoutProps = {
  children: React.ReactNode;
};

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return <div className="mx-auto w-full max-w-3xl">{children}</div>;
}
