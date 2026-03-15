import { describe, expect, it, vi } from 'vitest';
import { runApply } from '../../scripts/governance/apply-main-branch-protection.mjs';
import { basePolicy, baseWorkflow, createGovernanceFixtures } from './test-helpers';

describe('runApply', () => {
  it('refuses mutation without --confirm', async () => {
    const { policyPath, workflowPath } = await createGovernanceFixtures({
      policy: basePolicy,
      workflow: baseWorkflow,
    });

    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = runApply({
      argv: ['--repo', 'acme/brujula-civil', '--policy', policyPath, '--workflow', workflowPath],
      logger,
      ghRunner: vi.fn(),
    });

    expect(exitCode).toBe(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Refusing mutation'));
  });

  it('applies drift and verifies readback convergence', async () => {
    const { policyPath, workflowPath } = await createGovernanceFixtures({
      policy: basePolicy,
      workflow: baseWorkflow,
    });

    const desired = JSON.parse(basePolicy);
    const drifted = JSON.parse(basePolicy);
    drifted.rules[0].parameters.required_status_checks = [
      { context: 'verify (ubuntu-latest)', integration_id: null },
    ];
    drifted.id = 42;

    const runner = vi
      .fn()
      .mockReturnValueOnce({ permissions: { admin: true } })
      .mockReturnValueOnce([drifted])
      .mockReturnValueOnce({ id: 42 })
      .mockReturnValueOnce([desired]);

    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = runApply({
      argv: [
        '--repo',
        'acme/brujula-civil',
        '--policy',
        policyPath,
        '--workflow',
        workflowPath,
        '--confirm',
      ],
      logger,
      ghRunner: runner,
    });

    expect(exitCode).toBe(0);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
