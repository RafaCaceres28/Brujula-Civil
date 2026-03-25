import { createClient } from '@/lib/supabase/server';
import { describe, expect, it, vi } from 'vitest';
import { cvPreviewFixture } from '../../translation/server/__fixtures__/contract-fixtures';
import { getCvDraft } from './get-cv';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

function createSupabaseMock(aggregatedDraft: Record<string, unknown>) {
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
      };
    },
  };

  return { client };
}

describe('getCvDraft', () => {
  it('recovers editable cv draft from partial flow without recommendations', async () => {
    const { client } = createSupabaseMock({
      employabilityFlow: {
        flowState: 'preview_editing',
        translation: {
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
          generatedAt: '2026-03-24T01:00:00.000Z',
        },
        recommendations: null,
        cvPreviewDraft: {
          previewVersionId: 'preview-legacy-1',
          cvPreview: cvPreviewFixture,
          isUserEdited: true,
          profileSnapshotId: 'profile-snapshot-user-001',
          sourceRefMap: {
            'translation-block-1': 'profile-snapshot-user-001',
          },
          updatedAt: '2026-03-24T01:05:00.000Z',
        },
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await getCvDraft('user-1');

    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) {
      throw new Error('Expected CV draft recovery success');
    }

    expect(result.data.previewVersionId).toBe('preview-legacy-1');
    expect(result.data.isUserEdited).toBe(true);
    expect(result.data.cvPreview.sections[0]?.content).toContain('Operations leader');
    expect(result.meta?.source).toBe('cv.server.get-cv');
  });
});
