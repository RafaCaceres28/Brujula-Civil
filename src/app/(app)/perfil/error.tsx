'use client';

type ErrorProps = {
  error: Error;
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div role="alert" className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
      <h2 className="text-base font-semibold text-red-900">No pudimos cargar tu perfil</h2>
      <p className="text-sm text-red-800">
        Ocurrio un error al recuperar los datos. Intenta nuevamente en unos segundos.
      </p>
      <p className="text-xs text-red-700">Referencia: {error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white"
      >
        Reintentar
      </button>
    </div>
  );
}
