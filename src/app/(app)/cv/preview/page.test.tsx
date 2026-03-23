import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

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

async function setupPage() {
  const { default: CvPreviewPage } = await import('./page');

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(<CvPreviewPage />);
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

  return { textarea, prepareButton };
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
  it('normalizes edited section content before preparing export payload', async () => {
    const { textarea, prepareButton } = await setupPage();

    await changeTextareaValue(textarea, '   Updated summary from UI   ');
    await click(prepareButton);

    const payload = container?.querySelector<HTMLElement>(
      '[data-testid="prepared-preview-payload"]',
    );

    expect(payload?.textContent).toContain('Updated summary from UI');
    expect(payload?.textContent).not.toContain('   Updated summary from UI   ');
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
});
