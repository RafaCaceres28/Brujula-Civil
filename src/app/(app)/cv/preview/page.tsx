'use client';

import { useMemo, useState } from 'react';
import { parseEditableCvPreviewBoundary } from '../../../../features/cv/services/cv.mapper';
import type { CvDomainOutput } from '../../../../features/cv/types/cv.types';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<CvDomainOutput | null>(null);

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
  };

  const handlePrepareForExport = () => {
    const result = parseEditableCvPreviewBoundary(previewDraft);

    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    setErrorMessage(null);
    setLastPayload(result.data);
  };

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Preview CV</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Puedes editar el contenido antes de preparar la exportacion a PDF.
        </p>
      </header>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {sections.map((section) => (
          <label key={section.id} className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">{section.title}</span>
            <textarea
              name={`section-${section.id}`}
              value={section.content}
              rows={6}
              onChange={(event) => handleSectionContentChange(section.id, event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
        ))}

        <button
          type="button"
          data-action="prepare-export"
          onClick={handlePrepareForExport}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Preparar exportacion
        </button>

        {errorMessage ? (
          <p role="alert" className="text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {lastPayload ? (
          <pre
            data-testid="prepared-preview-payload"
            className="overflow-auto rounded-lg bg-slate-50 p-3"
          >
            {JSON.stringify(lastPayload, null, 2)}
          </pre>
        ) : null}
      </div>
    </main>
  );
}
