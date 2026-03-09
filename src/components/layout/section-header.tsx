type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-slate-600">{description}</p> : null}
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}
