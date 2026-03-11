import { Card, CardContent, CardHeader } from '@/components/ui/card';

type WizardShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function WizardShell({ title, description, children }: WizardShellProps) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}
