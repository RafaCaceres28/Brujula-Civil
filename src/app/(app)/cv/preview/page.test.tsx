import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  if (!container) {
    return;
  }

  act(() => {
    root?.unmount();
    container?.remove();
  });

  container = null;
  root = null;
});

beforeEach(() => {
  window.sessionStorage.clear();
});

async function setupPage() {
  const { default: CvPreviewPage } = await import('./page');

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(<CvPreviewPage />);
  });

  await act(async () => {
    await Promise.resolve();
  });

  const textarea = container.querySelector<HTMLTextAreaElement>(
    '[name="section-cv-section-summary"]',
  );
  if (!textarea) {
    throw new Error('Summary textarea not found');
  }

  const prepareButton = container.querySelector<HTMLButtonElement>(
    '[data-action="prepare-export"]',
  );
  if (!prepareButton) {
    throw new Error('Prepare export button not found');
  }

  const exportButton = container.querySelector<HTMLButtonElement>('[data-action="export-pdf"]');
  if (!exportButton) {
    throw new Error('Export PDF button not found');
  }

  return { textarea, prepareButton, exportButton };
}

async function changeTextareaValue(textarea: HTMLTextAreaElement, nextValue: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set;

  await act(async () => {
    valueSetter?.call(textarea, nextValue);
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function click(button: HTMLButtonElement) {
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('cv preview editable boundary', () => {
  it('shows loading status while starting PDF export', async () => {
    const { textarea, prepareButton, exportButton } = await setupPage();

    await changeTextareaValue(textarea, 'Export loading state content');
    await click(prepareButton);

    act(() => {
      exportButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const loadingStatus = container?.querySelector<HTMLElement>('[role="status"]');

    expect(loadingStatus?.textContent).toContain('Iniciando exportacion PDF...');

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('normalizes edited section content before preparing export payload', async () => {
    const { textarea, prepareButton, exportButton } = await setupPage();

    await changeTextareaValue(textarea, '   Updated summary from UI   ');

    expect(exportButton.disabled).toBe(true);

    await click(prepareButton);

    const payload = container?.querySelector<HTMLElement>(
      '[data-testid="prepared-preview-payload"]',
    );
    const checkpoint = container?.querySelector<HTMLElement>('[data-testid="preview-version-id"]');

    expect(payload?.textContent).toContain('Updated summary from UI');
    expect(payload?.textContent).not.toContain('   Updated summary from UI   ');
    expect(checkpoint?.textContent).toContain('Checkpoint confirmado: preview-');
    expect(exportButton.disabled).toBe(false);
  });

  it('blocks export preparation when editable content is empty after normalization', async () => {
    const { textarea, prepareButton } = await setupPage();

    await changeTextareaValue(textarea, '     ');
    await click(prepareButton);

    const alert = container?.querySelector<HTMLElement>('[role="alert"]');
    const payload = container?.querySelector<HTMLElement>(
      '[data-testid="prepared-preview-payload"]',
    );

    expect(alert?.textContent).toContain('Invalid editable CV preview payload');
    expect(payload).toBeNull();
  });

  it('requires checkpoint confirmation before exporting PDF payload', async () => {
    const { textarea, prepareButton, exportButton } = await setupPage();

    expect(exportButton.disabled).toBe(true);
    await click(exportButton);

    const blockedPayload = container?.querySelector<HTMLElement>(
      '[data-testid="pdf-export-payload"]',
    );
    expect(blockedPayload).toBeNull();

    await changeTextareaValue(textarea, ' Snapshot-ready content ');
    await click(prepareButton);
    expect(exportButton.disabled).toBe(false);
    await click(exportButton);

    const pdfPayload = container?.querySelector<HTMLElement>('[data-testid="pdf-export-payload"]');

    expect(pdfPayload?.textContent).toContain('"previewVersionId"');
    expect(pdfPayload?.textContent).toContain('"format": "pdf"');
    expect(pdfPayload?.textContent).toContain('Snapshot-ready content');
    expect(pdfPayload?.textContent).toContain('"isUserEdited": true');
  });

  it('rehydrates edited draft content from session storage on re-entry', async () => {
    const { textarea } = await setupPage();

    await changeTextareaValue(textarea, 'Content persisted between entries');

    act(() => {
      root?.unmount();
      container?.remove();
    });

    container = null;
    root = null;

    const { textarea: rehydratedTextarea } = await setupPage();

    expect(rehydratedTextarea.value).toBe('Content persisted between entries');
  });

  it('shows empty state when persisted draft has no sections and allows recovery', async () => {
    window.sessionStorage.setItem(
      'cv-preview-draft-v1',
      JSON.stringify({ sections: [], isUserEdited: true }),
    );

    const { default: CvPreviewPage } = await import('./page');

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<CvPreviewPage />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container?.textContent).toContain(
      'El borrador guardado no tiene secciones. Restaura el contenido base para continuar.',
    );

    const restoreButton = container?.querySelector<HTMLButtonElement>(
      '[data-action="restore-default-preview"]',
    );
    expect(restoreButton).not.toBeNull();

    await click(restoreButton as HTMLButtonElement);

    const textarea = container?.querySelector<HTMLTextAreaElement>(
      '[name="section-cv-section-summary"]',
    );
    expect(textarea).not.toBeNull();
  });

  it('shows safe recovery error when persisted draft is malformed and supports retry', async () => {
    window.sessionStorage.setItem('cv-preview-draft-v1', '{not-json');

    const { default: CvPreviewPage } = await import('./page');

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<CvPreviewPage />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const alert = container?.querySelector<HTMLElement>('[role="alert"]');
    const retryButton = container?.querySelector<HTMLButtonElement>(
      '[data-action="retry-preview-recovery"]',
    );

    expect(alert?.textContent).toContain(
      'No pudimos recuperar el borrador guardado. Puedes restaurar el preview y continuar.',
    );
    expect(retryButton).not.toBeNull();

    await click(retryButton as HTMLButtonElement);

    const textarea = container?.querySelector<HTMLTextAreaElement>(
      '[name="section-cv-section-summary"]',
    );
    expect(textarea).not.toBeNull();
  });

  it('renders selected route traceability without blocking manual edits', async () => {
    const { textarea, prepareButton, exportButton } = await setupPage();

    await changeTextareaValue(textarea, 'Traceability check content');
    expect(exportButton.disabled).toBe(true);
    await click(prepareButton);
    expect(exportButton.disabled).toBe(false);
    await click(exportButton);

    const traceability = container?.querySelector<HTMLElement>(
      '[data-testid="cv-flow-traceability"]',
    );

    expect(traceability?.textContent).toContain('perfil -> listo');
    expect(traceability?.textContent).toContain('traduccion -> listo');
    expect(traceability?.textContent).toContain(
      'ruta elegida -> route-operations-coordinator-logistics-mid',
    );
    expect(traceability?.textContent).toContain('preview -> listo');
    expect(traceability?.textContent).toContain('pdf -> listo');
    expect(traceability?.textContent).toContain('version preview -> preview-');
  });
});
