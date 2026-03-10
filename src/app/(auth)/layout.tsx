import { redirectIfAuthenticated } from '@/features/auth/server/redirect-if-authenticated';

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  await redirectIfAuthenticated();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">{children}</div>
    </div>
  );
}
