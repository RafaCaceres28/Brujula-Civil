export type TranslationResult = {
  professionalSummary: string;
  transferableSkills: string[];
  suggestedRoles: string[];
};

export type GenerateTranslationInput = {
  userId: string;
};
