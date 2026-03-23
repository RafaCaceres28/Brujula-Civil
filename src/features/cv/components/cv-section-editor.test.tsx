import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CvSectionEditor } from './cv-section-editor';

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

function setupEditor() {
  const onSectionContentChange = vi.fn();

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <CvSectionEditor
        sections={[
          {
            id: 'cv-section-summary',
            title: 'Professional Summary',
            content: 'Initial summary content',
            sourceBlockIds: ['translation-block-1'],
          },
        ]}
        onSectionContentChange={onSectionContentChange}
      />,
    );
  });

  const textarea = container.querySelector<HTMLTextAreaElement>(
    '[name="section-cv-section-summary"]',
  );
  if (!textarea) {
    throw new Error('Section textarea not found');
  }

  return { textarea, onSectionContentChange };
}

describe('CvSectionEditor', () => {
  it('emits edited section content through callback', async () => {
    const { textarea, onSectionContentChange } = setupEditor();

    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set;

    await act(async () => {
      valueSetter?.call(textarea, 'Edited summary content');
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onSectionContentChange).toHaveBeenCalledWith(
      'cv-section-summary',
      'Edited summary content',
    );
  });
});
