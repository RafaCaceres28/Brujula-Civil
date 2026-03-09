type ErrorStateProps = {
  message?: string;
};

export function ErrorState({ message = 'Ha ocurrido un error.' }: ErrorStateProps) {
  return <div className="text-sm text-red-600">{message}</div>;
}
