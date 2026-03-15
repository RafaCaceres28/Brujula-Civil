import { describe, expect, it } from 'vitest';
import { normalizeRuleset } from '../../scripts/governance/normalize-ruleset.mjs';

describe('normalizeRuleset', () => {
  it('normalizes ordering and non-contract noise deterministically', () => {
    const local = {
      name: 'main-branch-protection',
      target: 'branch',
      enforcement: 'active',
      conditions: {
        ref_name: {
          include: ['~DEFAULT_BRANCH'],
          exclude: [],
        },
      },
      rules: [
        {
          type: 'pull_request',
          parameters: {
            required_review_thread_resolution: true,
            dismiss_stale_reviews_on_push: true,
            require_last_push_approval: false,
            required_approving_review_count: 1,
            require_code_owner_review: false,
          },
        },
        {
          type: 'required_status_checks',
          parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: [
              { context: 'verify (windows-latest)', integration_id: null },
              { context: 'verify (ubuntu-latest)', integration_id: null },
            ],
          },
        },
        { type: 'non_fast_forward' },
      ],
      bypass_actors: [],
    };

    const live = {
      id: 99,
      name: 'main-branch-protection',
      target: 'branch',
      enforcement: 'active',
      conditions: {
        ref_name: {
          include: ['~DEFAULT_BRANCH'],
          exclude: [],
        },
      },
      rules: [
        {
          type: 'required_status_checks',
          parameters: {
            required_status_checks: [
              { context: 'verify (ubuntu-latest)', integration_id: null },
              { context: 'verify (windows-latest)', integration_id: null },
            ],
            strict_required_status_checks_policy: true,
          },
        },
        { type: 'non_fast_forward' },
        {
          type: 'pull_request',
          parameters: {
            required_approving_review_count: 1,
            dismiss_stale_reviews_on_push: true,
            require_code_owner_review: false,
            require_last_push_approval: false,
            required_review_thread_resolution: true,
          },
        },
      ],
      bypass_actors: [],
    };

    expect(normalizeRuleset(local)).toEqual(normalizeRuleset(live));
  });
});
