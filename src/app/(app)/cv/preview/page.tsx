'use client';

import { useEffect, useMemo, useState } from 'react';
import { CvPreview } from '../../../../features/cv/components/cv-preview';
import { CvSectionEditor } from '../../../../features/cv/components/cv-section-editor';
import { parseEditableCvPreviewBoundary } from '../../../../features/cv/services/cv.mapper';
import type { CvDomainOutput } from '../../../../features/cv/types/cv.types';

function createPreviewVersionId() {
  return `preview-${Date.now()}`;
}

const PREVIEW_DRAFT_STORAGE_KEY = 'cv-preview-draft-v1';

type PersistedPreviewDraft = {
  sections: CvDomainOutput['sections'];
  isUserEdited: boolean;
};

type PersistedPreviewDraftReadResult =
  | { state: 'ready'; draft: PersistedPreviewDraft }
  | { state: 'empty' }
  | { state: 'error' }
  | { state: 'none' };

function readPersistedPreviewDraft(): PersistedPreviewDraftReadResult {
  if (typeof window === 'undefined') {
    return { state: 'none' };
  }

  const rawDraft = window.sessionStorage.getItem(PREVIEW_DRAFT_STORAGE_KEY);
  if (!rawDraft) {
    return { state: 'none' };
  }

  try {
    const parsedDraft = JSON.parse(rawDraft) as Partial<PersistedPreviewDraft>;
    if (!Array.isArray(parsedDraft.sections) || typeof parsedDraft.isUserEdited !== 'boolean') {
      return { state: 'error' };
    }

    if (parsedDraft.sections.length === 0) {
      return { state: 'empty' };
    }

    const previewBoundary = parseEditableCvPreviewBoundary({
      ...DEFAULT_CV_PREVIEW,
      sections: parsedDraft.sections,
    });

    if (!previewBoundary.ok) {
      return { state: 'error' };
    }

    return {
      state: 'ready',
      draft: {
        sections: previewBoundary.data.sections,
        isUserEdited: parsedDraft.isUserEdited,
      },
    };
  } catch {
    return { state: 'error' };
  }
}

function persistPreviewDraft(draft: PersistedPreviewDraft) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(PREVIEW_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

const DEFAULT_CV_PREVIEW: CvDomainOutput = {
  sections: [
    {
      id: 'cv-section-summary',
      title: 'Professional Summary',
      content: 'Operations leader with transition-ready profile.',
      sourceBlockIds: ['translation-block-1'],
    },
  ],
  layout: {
    templateKey: 'single-column',
    columns: 1,
  },
  completeness: 'needs_review',
};

export default function CvPreviewPage() {
  const [sections, setSections] = useState(DEFAULT_CV_PREVIEW.sections);
  const [isUserEdited, setIsUserEdited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hasRecoveryIssue, setHasRecoveryIssue] = useState(false);
  const [isEmptyDraftState, setIsEmptyDraftState] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmedPreviewSnapshot, setConfirmedPreviewSnapshot] = useState<CvDomainOutput | null>(
    null,
  );
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [pdfExportPayload, setPdfExportPayload] = useState<Record<string, unknown> | null>(null);

  const previewDraft = useMemo(
    () => ({
      ...DEFAULT_CV_PREVIEW,
      sections,
    }),
    [sections],
  );

  const handleSectionContentChange = (sectionId: string, nextContent: string) => {
    setSections((currentSections) =>
      currentSections.map((section) =>
        section.id === sectionId ? { ...section, content: nextContent } : section,
      ),
    );
    setIsUserEdited(true);
    setConfirmedPreviewSnapshot(null);
    setPreviewVersionId(null);
    setPdfExportPayload(null);
  };

  useEffect(() => {
    const persistedDraft = readPersistedPreviewDraft();

    if (persistedDraft.state === 'ready') {
      setSections(persistedDraft.draft.sections);
      setIsUserEdited(persistedDraft.draft.isUserEdited);
      setHasRecoveryIssue(false);
      setIsEmptyDraftState(false);
      setIsHydrating(false);
      return;
    }

    if (persistedDraft.state === 'error') {
      setHasRecoveryIssue(true);
      setIsEmptyDraftState(false);
      setIsHydrating(false);
      return;
    }

    if (persistedDraft.state === 'empty') {
      setHasRecoveryIssue(false);
      setIsEmptyDraftState(true);
      setIsHydrating(false);
      return;
    }

    setHasRecoveryIssue(false);
    setIsEmptyDraftState(false);
    setIsHydrating(false);
  }, []);

  useEffect(() => {
    persistPreviewDraft({
      sections,
      isUserEdited,
    });
  }, [isUserEdited, sections]);

  const handlePrepareForExport = () => {
    if (!isUserEdited) {
      setErrorMessage('Debes editar al menos una sección antes de confirmar el checkpoint.');
      setConfirmedPreviewSnapshot(null);
      setPreviewVersionId(null);
      setPdfExportPayload(null);
      return;
    }

    const result = parseEditableCvPreviewBoundary(previewDraft);

    if (!result.ok) {
      setErrorMessage(result.error.message);
      setConfirmedPreviewSnapshot(null);
      setPreviewVersionId(null);
      setPdfExportPayload(null);
      return;
    }

    setErrorMessage(null);
    setConfirmedPreviewSnapshot(result.data);
    setPreviewVersionId(createPreviewVersionId());
  };

  const handleExportPdf = async () => {
    if (!isUserEdited || !confirmedPreviewSnapshot || !previewVersionId) {
      setErrorMessage('Debes confirmar el checkpoint del preview antes de exportar.');
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);

    await Promise.resolve();

    try {
      setPdfExportPayload({
        userId: 'preview-user',
        cvPreview: confirmedPreviewSnapshot,
        format: 'pdf',
        locale: 'es-ES',
        previewVersionId,
        isUserEdited,
      });
    } catch {
      setErrorMessage('No pudimos iniciar la exportacion. Reintenta sin perder tu borrador.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRetryDraftRecovery = () => {
    window.sessionStorage.removeItem(PREVIEW_DRAFT_STORAGE_KEY);
    setSections(DEFAULT_CV_PREVIEW.sections);
    setIsUserEdited(false);
    setConfirmedPreviewSnapshot(null);
    setPreviewVersionId(null);
    setPdfExportPayload(null);
    setErrorMessage(null);
    setHasRecoveryIssue(false);
    setIsEmptyDraftState(false);
  };

  if (isHydrating) {
    return (
      <main className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Preview CV</h1>
          <p role="status" className="max-w-2xl text-sm text-slate-600">
            Cargando borrador del preview...
          </p>
        </header>
      </main>
    );
  }

  if (hasRecoveryIssue) {
    return (
      <main className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Preview CV</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Puedes editar el contenido antes de preparar la exportacion a PDF.
          </p>
        </header>

        <section className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p role="alert" className="text-sm text-red-700">
            No pudimos recuperar el borrador guardado. Puedes restaurar el preview y continuar.
          </p>
          <button
            type="button"
            data-action="retry-preview-recovery"
            onClick={handleRetryDraftRecovery}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900"
          >
            Reintentar recuperacion
          </button>
        </section>
      </main>
    );
  }

  if (isEmptyDraftState) {
    return (
      <main className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Preview CV</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Puedes editar el contenido antes de preparar la exportacion a PDF.
          </p>
        </header>

        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm text-slate-700">
            El borrador guardado no tiene secciones. Restaura el contenido base para continuar.
          </p>
          <button
            type="button"
            data-action="restore-default-preview"
            onClick={handleRetryDraftRecovery}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900"
          >
            Restaurar preview base
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Preview CV</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Puedes editar el contenido antes de preparar la exportacion a PDF.
        </p>
      </header>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <CvSectionEditor sections={sections} onSectionContentChange={handleSectionContentChange} />

        <p data-testid="manual-edit-status" className="text-xs text-slate-500">
          {isUserEdited ? 'Edicion manual detectada.' : 'Debes editar una seccion para continuar.'}
        </p>

        <button
          type="button"
          data-action="prepare-export"
          onClick={handlePrepareForExport}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Confirmar checkpoint preview
        </button>

        <button
          type="button"
          data-action="export-pdf"
          onClick={() => {
            void handleExportPdf();
          }}
          disabled={!isUserEdited || !confirmedPreviewSnapshot || !previewVersionId}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Exportar PDF
        </button>

        {isExporting ? (
          <p role="status" className="text-xs text-slate-500">
            Iniciando exportacion PDF...
          </p>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {confirmedPreviewSnapshot ? (
          <pre
            data-testid="prepared-preview-payload"
            className="overflow-auto rounded-lg bg-slate-50 p-3"
          >
            {JSON.stringify(confirmedPreviewSnapshot, null, 2)}
          </pre>
        ) : null}

        {previewVersionId ? (
          <p data-testid="preview-version-id" className="text-xs text-slate-500">
            Checkpoint confirmado: {previewVersionId}
          </p>
        ) : null}

        {pdfExportPayload ? (
          <pre
            data-testid="pdf-export-payload"
            className="overflow-auto rounded-lg bg-slate-50 p-3"
          >
            {JSON.stringify(pdfExportPayload, null, 2)}
          </pre>
        ) : null}

        <CvPreview
          sections={sections}
          profileStage="ready"
          translationStage={sections.length > 0 ? 'ready' : 'pending'}
          previewStage={confirmedPreviewSnapshot ? 'ready' : 'pending'}
          pdfStage={pdfExportPayload ? 'ready' : errorMessage ? 'error' : 'pending'}
          previewVersionId={previewVersionId}
        />
      </div>
    </main>
  );
}
