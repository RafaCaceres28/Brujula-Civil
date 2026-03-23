import { cvPreviewOutputSchema, type CvPreviewInput } from '../../../cv/schemas/cv.schema';
import { pdfGenerationInputSchema } from '../../../documents/schemas/document.schema';
import { profileReadOutputSchema } from '../../../profile/schemas/profile.schema';
import { translationInputSchema, translationOutputSchema } from '../../schemas/translation.schema';
import type { ProfileDomainModel } from '../../../profile/types/profile.types';

export const profileDomainFixture: ProfileDomainModel = profileReadOutputSchema.parse({
  userId: 'user-001',
  profile: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: null,
    city: 'Madrid',
  },
  militaryBackground: {
    rank: 'Captain',
    area: 'Signals',
    yearsOfService: 12,
    summary: 'Led logistics and operations teams in high-pressure contexts.',
  },
  civilianTarget: {
    targetRole: 'Operations Manager',
    targetSector: 'Logistics',
    locationPreference: 'Remote',
  },
});

export const translationInputFixture = translationInputSchema.parse({
  userId: 'user-001',
  sourceProfile: {
    kind: 'profile_snapshot',
    snapshotId: 'profile-snapshot-user-001',
    summary: 'Led logistics and operations teams in high-pressure contexts.',
    highlights: [
      'Led logistics and operations teams in high-pressure contexts.',
      'Captain - Signals',
      'Operations Manager / Logistics',
    ],
  },
  sourceLanguage: 'es-ES',
  targetLanguage: 'en-US',
  tone: 'neutral',
});

export const translationOutputFixture = translationOutputSchema.parse({
  blocks: [
    {
      id: 'translation-block-1',
      sourceRef: 'profile-snapshot-user-001',
      content: 'Operations leader focused on logistics, planning and risk mitigation.',
    },
  ],
  sourceRefMap: {
    'translation-block-1': 'profile-snapshot-user-001',
  },
  qualityFlags: ['MISSING_CONTEXT'],
});

export const cvPreviewInputFixture: CvPreviewInput = {
  userId: 'user-001',
  profileSnapshotId: 'profile-snapshot-user-001',
  translatedContent: translationOutputFixture,
  templateKey: 'single-column',
};

export const cvPreviewFixture = cvPreviewOutputSchema.parse({
  sections: [
    {
      id: 'cv-section-summary',
      title: 'Professional Summary',
      content: 'Operations leader focused on logistics, planning and risk mitigation.',
      sourceBlockIds: ['translation-block-1'],
    },
  ],
  layout: {
    templateKey: 'single-column',
    columns: 1,
  },
  completeness: 'needs_review',
});

export const pdfGenerationInputFixture = pdfGenerationInputSchema.parse({
  userId: 'user-001',
  cvPreview: cvPreviewFixture,
  format: 'pdf',
  locale: 'es-ES',
});
