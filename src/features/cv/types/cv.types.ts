export type CvRow = unknown;

export type CvSection = {
  id: string;
  title: string;
  content: string;
};

export type CvDraft = {
  id: string;
  title: string;
  summary: string;
  sections: CvSection[];
  templateKey: string;
};

export type CvFormValues = {
  title: string;
  summary: string;
};

export type GenerateCvInput = {
  userId: string;
};

export type CvPreviewViewModel = {
  title: string;
  summary: string;
  sections: CvSection[];
};
