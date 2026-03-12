// TEMP TEST PAGE

'use client';

import { createClient } from '@/lib/supabase/browser';
import { useState } from 'react';

export default function TestStoragePage() {
  const [message, setMessage] = useState('');

  async function handleUpload() {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage('No hay usuario autenticado');
      return;
    }

    const fileContent = new Blob(['prueba storage brújula civil'], {
      type: 'text/plain',
    });

    const path = `${user.id}/cv/test-doc/v1/test.txt`;

    const { error } = await supabase.storage.from('user-documents').upload(path, fileContent, {
      contentType: 'text/plain',
      upsert: true,
    });

    if (error) {
      setMessage(`Error subiendo archivo: ${error.message}`);
      return;
    }

    setMessage(`Archivo subido correctamente en: ${path}`);
  }

  async function handleSignedUrl() {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage('No hay usuario autenticado');
      return;
    }

    const path = `${user.id}/cv/test-doc/v1/test.txt`;

    const { data, error } = await supabase.storage.from('user-documents').createSignedUrl(path, 60);

    if (error) {
      setMessage(`Error creando signed URL: ${error.message}`);
      return;
    }

    setMessage(`Signed URL creada correctamente:\n${data.signedUrl}`);
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Test Storage</h1>

      <button onClick={handleUpload} className="rounded bg-black px-4 py-2 text-white">
        Subir archivo de prueba
      </button>

      <button onClick={handleSignedUrl} className="rounded bg-green-700 px-4 py-2 text-white">
        Crear signed URL
      </button>

      {message ? <pre className="mt-4 whitespace-pre-wrap">{message}</pre> : null}
    </main>
  );
}
