import type { CvDomainOutput } from '../types/cv.types';

type CvSectionEditorProps = {
  sections: CvDomainOutput['sections'];
  onSectionContentChange: (sectionId: string, nextContent: string) => void;
};

export function CvSectionEditor({ sections, onSectionContentChange }: CvSectionEditorProps) {
  return (
    <div className="space-y-4" data-testid="cv-section-editor">
      {sections.map((section) => (
        <label key={section.id} className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">{section.title}</span>
          <textarea
            name={`section-${section.id}`}
            value={section.content}
            rows={6}
            onChange={(event) => onSectionContentChange(section.id, event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
      ))}
    </div>
  );
}
