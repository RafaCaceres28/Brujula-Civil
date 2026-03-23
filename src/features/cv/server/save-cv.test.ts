import { createClient } from '@/lib/supabase/server';
import { describe, expect, it, vi } from 'vitest';
import { cvPreviewFixture } from '../../translation/server/__fixtures__/contract-fixtures';
import { getCvDraft } from './get-cv';
import { saveCvDraft } from './save-cv';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

function createSupabaseMock(initialAggregatedDraft: Record<string, unknown> = {}) {
  let aggregatedDraft = initialAggregatedDraft;
  const calls: {
    updatePayload?: Record<string, unknown>;
  } = {};

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
          calls.updatePayload = payload;
          aggregatedDraft = payload.aggregated_draft_jsonb as Record<string, unknown>;
          return {
            eq: async () => ({ error: null }),
          };
        },
      };
    },
  };

  return { client, calls, getAggregatedDraft: () => aggregatedDraft };
}

describe('saveCvDraft/getCvDraft', () => {
  it('persists edited draft and allows re-entry recovery', async () => {
    const { client, calls, getAggregatedDraft } = createSupabaseMock({
      experiencia: {
        achievements: ['Mantuve SLA operativo'],
      },
    });

    vi.mocked(createClient).mockResolvedValue(client as never);

    const saveResult = await saveCvDraft({
      userId: 'user-001',
      cvPreview: {
        ...cvPreviewFixture,
        sections: cvPreviewFixture.sections.map((section) => ({
          ...section,
          content: `  ${section.content} Edited before save.  `,
        })),
      },
      previewVersionId: 'preview-v1',
      isUserEdited: true,
      profileSnapshotId: 'profile-snapshot-user-001',
      sourceRefMap: {
        'translation-block-1': 'profile-snapshot-user-001',
      },
    });

    expect(saveResult.ok).toBe(true);
    if (!saveResult.ok) {
      throw new Error('Expected save success');
    }

    const employabilityFlow = getAggregatedDraft().employabilityFlow as Record<string, unknown>;
    const persistedPreviewDraft = employabilityFlow.cvPreviewDraft as Record<string, unknown>;

    expect(calls.updatePayload).toBeDefined();
    expect(saveResult.data.cvPreview.sections[0]?.content).toContain('Edited before save.');
    expect(saveResult.data.cvPreview.sections[0]?.content).not.toContain('  ');
    expect(persistedPreviewDraft.previewVersionId).toBe('preview-v1');
    expect(getAggregatedDraft().experiencia).toEqual({
      achievements: ['Mantuve SLA operativo'],
    });

    const getResult = await getCvDraft('user-001');

    expect(getResult.ok).toBe(true);
    if (!getResult.ok || !getResult.data) {
      throw new Error('Expected draft recovery success');
    }

    expect(getResult.data.previewVersionId).toBe('preview-v1');
    expect(getResult.data.isUserEdited).toBe(true);
    expect(getResult.data.cvPreview.sections[0]?.content).toContain('Edited before save.');
  });

  it('rejects persistence if manual edit confirmation was not provided', async () => {
    const { client } = createSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await saveCvDraft({
      userId: 'user-001',
      cvPreview: cvPreviewFixture,
      previewVersionId: 'preview-v2',
      isUserEdited: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe(
        'Manual edit confirmation is required before saving CV draft',
      );
    }
  });
});
