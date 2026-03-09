type SpinnerProps = {
  label?: string;
};

export function Spinner({ label = 'Cargando...' }: SpinnerProps) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      <span>{label}</span>
    </div>
  );
}
