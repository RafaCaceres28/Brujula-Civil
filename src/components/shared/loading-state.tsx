type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = 'Cargando...' }: LoadingStateProps) {
  return <div className="text-sm text-slate-500">{message}</div>;
}
