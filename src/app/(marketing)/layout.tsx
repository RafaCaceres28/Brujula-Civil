import { Container } from '@/components/layout/container';

type MarketingLayoutProps = {
  children: React.ReactNode;
};

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b">
        <Container className="flex h-16 items-center justify-between">
          <div className="font-semibold">Brújula Civil</div>
          <nav className="text-sm text-slate-600">Marketing nav</nav>
        </Container>
      </header>

      <main>
        <Container className="py-10">{children}</Container>
      </main>
    </div>
  );
}
