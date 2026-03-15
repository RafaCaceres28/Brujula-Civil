import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export async function createGovernanceFixtures({
  policy,
  workflow,
}: {
  policy: string;
  workflow: string;
}) {
  const dir = await mkdtemp(join(tmpdir(), 'governance-test-'));
  const policyPath = join(dir, 'main-branch-ruleset.json');
  const workflowPath = join(dir, 'verify.yml');
  await writeFile(policyPath, policy, 'utf8');
  await writeFile(workflowPath, workflow, 'utf8');
  return { policyPath, workflowPath };
}

export const baseWorkflow = `name: Verify
jobs:
  verify:
    name: verify (\${{ matrix.os }})
    strategy:
      matrix:
        os:
          - ubuntu-latest
          - windows-latest
`;

export const basePolicy = JSON.stringify(
  {
    name: 'main-branch-protection',
    target: 'branch',
    enforcement: 'active',
    conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
    rules: [
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: [
            { context: 'verify (ubuntu-latest)', integration_id: null },
            { context: 'verify (windows-latest)', integration_id: null },
          ],
        },
      },
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
      { type: 'non_fast_forward' },
    ],
    bypass_actors: [],
  },
  null,
  2,
);
