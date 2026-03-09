import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <h1 className="text-3xl font-bold">Página no encontrada</h1>
      <p className="text-slate-600">La ruta que buscas no existe dentro de Brújula Civil.</p>
      <Link href="/" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
        Volver al inicio
      </Link>
    </div>
  );
}
