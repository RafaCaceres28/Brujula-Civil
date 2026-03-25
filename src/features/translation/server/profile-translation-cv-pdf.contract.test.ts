import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { createDomainError, domainFailure, domainSuccess } from '../../../lib/contracts/index';
import { generateCv } from '../../cv/server/generate-cv';
import { exportCvPdf } from '../../cv/server/export-cv-pdf';
import { getCvDraft } from '../../cv/server/get-cv';
import { mapTranslationOutputToCvInput } from '../../cv/services/cv.mapper';
import { saveCvDraft } from '../../cv/server/save-cv';
import * as pdfModule from '../../documents/server/generate-pdf';
import { mapProfileToTranslationSnapshot } from '../../profile/services/profile.mapper';
import { getProfile } from '../../profile/server/get-profile';
import { getOnboardingOverview } from '../../wizard/server/get-onboarding-overview';
import { generateTranslation } from './generate-translation';
import { getTranslation } from './get-translation';
import { profileDomainFixture } from './__fixtures__/contract-fixtures';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('../../profile/server/get-profile', () => ({
  getProfile: vi.fn(),
}));

vi.mock('../../wizard/server/get-onboarding-overview', () => ({
  getOnboardingOverview: vi.fn(),
}));

function createDraftPersistenceMock() {
  let aggregatedDraft: Record<string, unknown> = {};

  const client = {
    from(table: string) {
      if (table !== 'user_wizard_state') {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: {
                    aggregated_draft_jsonb: aggregatedDraft,
                  },
                  error: null,
                }),
              };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          aggregatedDraft = payload.aggregated_draft_jsonb as Record<string, unknown>;
          return {
            eq: async () => ({ error: null }),
          };
        },
      };
    },
  };

  return { client };
}

describe('profile -> translation -> cv -> pdf contract slice', () => {
  beforeEach(() => {
    const { client } = createDraftPersistenceMock();
    vi.mocked(createClient).mockResolvedValue(client as never);
  });

  it('keeps schema-compatible payloads and traceability across all steps', async () => {
    const profileSnapshot = mapProfileToTranslationSnapshot(profileDomainFixture);

    const translationInput = {
      userId: profileDomainFixture.userId,
      sourceProfile: profileSnapshot,
      sourceLanguage: 'es-ES',
      targetLanguage: 'en-US',
      tone: 'neutral',
      selectedRouteId: 'route-operations-coordinator-logistics-mid',
    } as const;

    const translationResult = await generateTranslation(translationInput);

    expect(translationResult.ok).toBe(true);
    if (!translationResult.ok) {
      throw new Error('Expected translation success');
    }

    const translationOutput = translationResult.data;

    expect(translationOutput.selectedRouteId).toBe(translationInput.selectedRouteId);
    expect(translationOutput.sourceRefMap['translation-block-1']).toBe(profileSnapshot.snapshotId);

    const cvInput = mapTranslationOutputToCvInput({
      userId: translationInput.userId,
      profileSnapshotId: profileSnapshot.snapshotId,
      translatedContent: translationOutput,
      templateKey: 'single-column',
    });

    const cvResult = await generateCv(cvInput);

    expect(cvResult.ok).toBe(true);
    if (!cvResult.ok) {
      throw new Error('Expected CV preview success');
    }

    const cvPreview = cvResult.data;

    expect(cvPreview.selectedRouteId).toBe(translationInput.selectedRouteId);
    expect(cvPreview.sections[0]?.sourceBlockIds).toContain('translation-block-1');

    const editedCvPreview = {
      ...cvPreview,
      sections: cvPreview.sections.map((section) => ({
        ...section,
        content: `${section.content} Edited for final review.`,
      })),
    };

    const saveResult = await saveCvDraft({
      userId: translationInput.userId,
      cvPreview: editedCvPreview,
      profileSnapshotId: profileSnapshot.snapshotId,
      previewVersionId: 'preview-v1',
      isUserEdited: true,
      sourceRefMap: translationOutput.sourceRefMap,
    });

    expect(saveResult.ok).toBe(true);
    if (!saveResult.ok) {
      throw new Error('Expected CV draft persistence success');
    }

    const recoveredDraftResult = await getCvDraft(translationInput.userId);
    expect(recoveredDraftResult.ok).toBe(true);
    if (!recoveredDraftResult.ok || !recoveredDraftResult.data) {
      throw new Error('Expected CV draft recovery success');
    }

    const pdfResult = await exportCvPdf({
      userId: translationInput.userId,
      cvPreview: recoveredDraftResult.data.cvPreview,
      locale: 'es-ES',
      previewVersionId: recoveredDraftResult.data.previewVersionId,
      isUserEdited: recoveredDraftResult.data.isUserEdited,
      selectedRouteId: translationInput.selectedRouteId,
    });

    expect(pdfResult.ok).toBe(true);
    if (!pdfResult.ok) {
      throw new Error('Expected PDF success');
    }

    expect(pdfResult.data.status).toBe('queued');
    expect(pdfResult.data.storagePath).toContain(`documents/${translationInput.userId}`);
    expect(pdfResult.meta?.traceability?.selectedRouteId).toBe(translationInput.selectedRouteId);
    expect(pdfResult.meta?.traceability?.previewVersionId).toBe(
      recoveredDraftResult.data.previewVersionId,
    );
    expect(pdfResult.meta?.traceability?.documentId).toBe(pdfResult.data.documentId);
    expect(pdfResult.meta?.source).toBe('cv.server.export-cv-pdf');
  });

  it('keeps backward compatibility for legacy flow without selected route', async () => {
    const profileSnapshot = mapProfileToTranslationSnapshot(profileDomainFixture);

    const translationResult = await generateTranslation({
      userId: profileDomainFixture.userId,
      sourceProfile: profileSnapshot,
      sourceLanguage: 'es-ES',
      targetLanguage: 'en-US',
      tone: 'neutral',
    });

    expect(translationResult.ok).toBe(true);
    if (!translationResult.ok) {
      throw new Error('Expected translation success');
    }

    expect(translationResult.data.selectedRouteId).toBeUndefined();

    const cvResult = await generateCv(
      mapTranslationOutputToCvInput({
        userId: profileDomainFixture.userId,
        profileSnapshotId: profileSnapshot.snapshotId,
        translatedContent: translationResult.data,
        templateKey: 'single-column',
      }),
    );

    expect(cvResult.ok).toBe(true);
    if (!cvResult.ok) {
      throw new Error('Expected CV preview success');
    }

    const saveResult = await saveCvDraft({
      userId: profileDomainFixture.userId,
      cvPreview: cvResult.data,
      profileSnapshotId: profileSnapshot.snapshotId,
      previewVersionId: 'preview-legacy-v1',
      isUserEdited: true,
      sourceRefMap: translationResult.data.sourceRefMap,
    });

    expect(saveResult.ok).toBe(true);
    if (!saveResult.ok) {
      throw new Error('Expected CV draft persistence success');
    }

    const recoveredDraftResult = await getCvDraft(profileDomainFixture.userId);
    expect(recoveredDraftResult.ok).toBe(true);
    if (!recoveredDraftResult.ok || !recoveredDraftResult.data) {
      throw new Error('Expected CV draft recovery success');
    }

    const pdfResult = await exportCvPdf({
      userId: profileDomainFixture.userId,
      cvPreview: recoveredDraftResult.data.cvPreview,
      locale: 'es-ES',
      previewVersionId: recoveredDraftResult.data.previewVersionId,
      isUserEdited: recoveredDraftResult.data.isUserEdited,
    });

    expect(pdfResult.ok).toBe(true);
    if (!pdfResult.ok) {
      throw new Error('Expected PDF success');
    }

    expect(pdfResult.meta?.traceability?.selectedRouteId).toBeUndefined();
    expect(pdfResult.meta?.traceability?.previewVersionId).toBe(
      recoveredDraftResult.data.previewVersionId,
    );
  });

  it('supports retry-safe export after a controlled PDF failure without losing draft', async () => {
    const profileSnapshot = mapProfileToTranslationSnapshot(profileDomainFixture);

    const translationResult = await generateTranslation({
      userId: profileDomainFixture.userId,
      sourceProfile: profileSnapshot,
      sourceLanguage: 'es-ES',
      targetLanguage: 'en-US',
      tone: 'neutral',
      selectedRouteId: 'route-project-manager-consulting-mid',
    });

    expect(translationResult.ok).toBe(true);
    if (!translationResult.ok) {
      throw new Error('Expected translation success');
    }

    const cvResult = await generateCv(
      mapTranslationOutputToCvInput({
        userId: profileDomainFixture.userId,
        profileSnapshotId: profileSnapshot.snapshotId,
        translatedContent: translationResult.data,
        templateKey: 'single-column',
      }),
    );

    expect(cvResult.ok).toBe(true);
    if (!cvResult.ok) {
      throw new Error('Expected CV preview success');
    }

    const editedPreview = {
      ...cvResult.data,
      sections: cvResult.data.sections.map((section) => ({
        ...section,
        content: `${section.content} Retry-safe update.`,
      })),
    };

    const saveResult = await saveCvDraft({
      userId: profileDomainFixture.userId,
      cvPreview: editedPreview,
      profileSnapshotId: profileSnapshot.snapshotId,
      previewVersionId: 'preview-retry-v1',
      isUserEdited: true,
      sourceRefMap: translationResult.data.sourceRefMap,
    });

    expect(saveResult.ok).toBe(true);
    if (!saveResult.ok) {
      throw new Error('Expected draft persistence success');
    }

    const generatePdfSpy = vi
      .spyOn(pdfModule, 'generatePdf')
      .mockResolvedValueOnce(
        domainFailure(
          createDomainError({
            code: 'EXTERNAL_DEPENDENCY_ERROR',
            message: 'PDF provider unavailable',
            retryable: true,
          }),
        ),
      )
      .mockResolvedValueOnce(
        domainSuccess({
          documentId: 'document-retry-success',
          status: 'queued',
          storagePath: `documents/${profileDomainFixture.userId}/document-retry-success.pdf`,
        }),
      );

    const firstExport = await exportCvPdf({
      userId: profileDomainFixture.userId,
      cvPreview: editedPreview,
      locale: 'es-ES',
      previewVersionId: 'preview-retry-v1',
      isUserEdited: true,
      selectedRouteId: 'route-project-manager-consulting-mid',
    });

    expect(firstExport.ok).toBe(false);
    if (firstExport.ok) {
      throw new Error('Expected first export to fail');
    }
    expect(firstExport.error.code).toBe('EXTERNAL_DEPENDENCY_ERROR');
    expect(firstExport.error.retryable).toBe(true);

    const recoveredDraft = await getCvDraft(profileDomainFixture.userId);
    expect(recoveredDraft.ok).toBe(true);
    if (!recoveredDraft.ok || !recoveredDraft.data) {
      throw new Error('Expected draft to remain available after failed export');
    }
    expect(recoveredDraft.data.previewVersionId).toBe('preview-retry-v1');
    expect(recoveredDraft.data.cvPreview.sections[0]?.content).toContain('Retry-safe update.');

    const secondExport = await exportCvPdf({
      userId: profileDomainFixture.userId,
      cvPreview: recoveredDraft.data.cvPreview,
      locale: 'es-ES',
      previewVersionId: recoveredDraft.data.previewVersionId,
      isUserEdited: recoveredDraft.data.isUserEdited,
      selectedRouteId: 'route-project-manager-consulting-mid',
    });

    expect(secondExport.ok).toBe(true);
    if (!secondExport.ok) {
      throw new Error('Expected retry export success');
    }
    expect(secondExport.data.status).toBe('queued');
    expect(secondExport.meta?.traceability?.selectedRouteId).toBe(
      'route-project-manager-consulting-mid',
    );
    expect(secondExport.meta?.traceability?.previewVersionId).toBe(
      recoveredDraft.data.previewVersionId,
    );
    expect(secondExport.meta?.traceability?.documentId).toBe(secondExport.data.documentId);

    generatePdfSpy.mockRestore();
  });

  it('keeps legacy compatibility when selectedRouteContext is incomplete in translation input', async () => {
    const profileSnapshot = mapProfileToTranslationSnapshot(profileDomainFixture);

    const translationResult = await generateTranslation({
      userId: profileDomainFixture.userId,
      sourceProfile: profileSnapshot,
      sourceLanguage: 'es-ES',
      targetLanguage: 'en-US',
      tone: 'neutral',
      selectedRouteId: 'route-team-lead-technology-mid',
      selectedRouteContext: {
        reasonSummarySnapshot: 'Resumen legado',
        fitLabelSnapshot: 'medio',
      },
    } as never);

    expect(translationResult.ok).toBe(true);
    if (!translationResult.ok) {
      throw new Error('Expected translation success for partial explainability context');
    }

    expect(translationResult.data.selectedRouteId).toBe('route-team-lead-technology-mid');
    expect(translationResult.data.selectedRouteContext).toBeUndefined();

    const cvResult = await generateCv(
      mapTranslationOutputToCvInput({
        userId: profileDomainFixture.userId,
        profileSnapshotId: profileSnapshot.snapshotId,
        translatedContent: translationResult.data,
        templateKey: 'single-column',
      }),
    );

    expect(cvResult.ok).toBe(true);
    if (!cvResult.ok) {
      throw new Error('Expected CV preview success');
    }

    const pdfResult = await exportCvPdf({
      userId: profileDomainFixture.userId,
      cvPreview: cvResult.data,
      locale: 'es-ES',
      previewVersionId: 'preview-partial-context-v1',
      isUserEdited: true,
    });

    expect(pdfResult.ok).toBe(true);
    if (!pdfResult.ok) {
      throw new Error('Expected PDF success for partial explainability context');
    }

    expect(pdfResult.meta?.traceability?.selectedRouteId).toBe('route-team-lead-technology-mid');
    expect(pdfResult.meta?.traceability?.selectedRouteFitLabel).toBeUndefined();
  });

  it('keeps recommendation explainability context after guided draft re-entry', async () => {
    vi.mocked(getProfile).mockResolvedValue(profileDomainFixture);
    vi.mocked(getOnboardingOverview).mockResolvedValue({
      state: null,
      steps: [],
      completedStepKeys: [],
      draft: {
        militar: {
          branch: 'army',
          corps: 'signals',
          rank: { code: 'captain', label: 'Capitán' },
          specialty: { code: 'communications', label: 'Comunicaciones / Sistemas' },
          serviceYears: 8,
          destinationContext: 'hq_staff',
          leadershipLevel: 'section_lead',
          teamSize: '6_15',
          unitName: null,
          notes: null,
        },
        experiencia: {
          responsibilityAreas: ['operations'],
          missionTypes: ['intl_stability'],
          functionTypes: ['coordination'],
          tools: ['erp'],
          leadershipScopes: ['team_supervision'],
          achievements: [],
          additionalContext: null,
        },
        competencias: {
          technicalSkills: ['operations_management'],
          softSkills: ['leadership'],
          certifications: ['quality_iso'],
          drivingLicenses: ['c'],
          languages: [{ name: 'english', level: 'advanced' }],
          officeTools: ['excel'],
          extraTraining: null,
        },
        objetivos: {
          targetRoles: [{ slug: 'project-manager', label: 'Gestor de Proyectos y Operaciones' }],
          targetSectors: ['consulting'],
          preferredLocations: ['madrid'],
          workModel: 'hybrid',
          seniority: 'manager',
          preferencesNotes: null,
        },
        resumen: {
          confirmed: false,
        },
      },
      employabilityFlow: {
        recommendations: {
          recommendationSetId: 'recset-snapshot-1-20260324010101',
          generatedAt: '2026-03-24T01:01:01.000Z',
          sourceSnapshotId: 'snapshot-1',
          routes: [
            {
              routeId: 'route-project-manager-consulting-mid',
              roleId: 'project-manager',
              sectorId: 'consulting',
              seniorityId: 'mid',
              reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
              matchedSignals: ['TARGET_ROLE_HINT'],
              explanation: {
                reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
                fitLabel: 'alto',
                fitScore: 88,
                explanationKeywords: ['planificacion', 'liderazgo'],
                decisionGuidance:
                  'Priorizala si quieres continuidad operativa con foco en gestion de equipos.',
              },
            },
            {
              routeId: 'route-operations-coordinator-logistics-mid',
              roleId: 'operations-coordinator',
              sectorId: 'logistics',
              seniorityId: 'mid',
              reasonSummary: 'Se recomienda por coincidencias operativas y logisticas.',
              matchedSignals: ['TARGET_SECTOR_HINT'],
            },
            {
              routeId: 'route-team-lead-technology-mid',
              roleId: 'team-lead',
              sectorId: 'technology',
              seniorityId: 'mid',
              reasonSummary: 'Se recomienda por experiencia de coordinacion de equipos.',
              matchedSignals: ['LEADERSHIP_MATCH'],
            },
          ],
        },
        selectedRoute: {
          recommendationSetId: 'recset-snapshot-1-20260324010101',
          selectedRouteId: 'route-project-manager-consulting-mid',
          selectedAt: '2026-03-24T01:05:03.000Z',
        },
        selectedRouteContext: {
          recommendationSetId: 'recset-snapshot-1-20260324010101',
          selectedRouteId: 'route-project-manager-consulting-mid',
          reasonSummarySnapshot: 'Se recomienda por coincidencias de planificacion y liderazgo.',
          fitLabelSnapshot: 'alto',
          guidanceSnapshot:
            'Priorizala si quieres continuidad operativa con foco en gestion de equipos.',
          capturedAt: '2026-03-24T01:05:03.000Z',
        },
      },
    });

    const context = await getTranslation(profileDomainFixture.userId, 'req-us3-translation');

    expect(context.ok).toBe(true);
    if (!context.ok || !context.data) {
      throw new Error('Expected translation context success with guided re-entry data');
    }

    expect(context.data.selectedRouteId).toBe('route-project-manager-consulting-mid');
    expect(context.data.selectedRouteContext).toMatchObject({
      fitLabelSnapshot: 'alto',
      reasonSummarySnapshot: 'Se recomienda por coincidencias de planificacion y liderazgo.',
    });

    const profileSnapshot = mapProfileToTranslationSnapshot(context.data.profile);
    const translationResult = await generateTranslation({
      userId: context.data.profile.userId,
      sourceProfile: profileSnapshot,
      sourceLanguage: 'es-ES',
      targetLanguage: 'en-US',
      tone: 'neutral',
      selectedRouteId: context.data.selectedRouteId,
      selectedRouteContext: context.data.selectedRouteContext,
    });

    expect(translationResult.ok).toBe(true);
    if (!translationResult.ok) {
      throw new Error('Expected translation success for guided re-entry context');
    }

    expect(translationResult.data.selectedRouteId).toBe('route-project-manager-consulting-mid');
    expect(translationResult.data.selectedRouteContext).toMatchObject({
      fitLabelSnapshot: 'alto',
      guidanceSnapshot:
        'Priorizala si quieres continuidad operativa con foco en gestion de equipos.',
    });
  });
});
