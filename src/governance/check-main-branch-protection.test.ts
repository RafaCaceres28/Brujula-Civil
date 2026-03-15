import { describe, expect, it, vi } from 'vitest';
import { runCheck } from '../../scripts/governance/check-main-branch-protection.mjs';
import { basePolicy, baseWorkflow, createGovernanceFixtures } from './test-helpers';

describe('runCheck', () => {
  it('returns exit 0 when policy and live ruleset match', async () => {
    const { policyPath, workflowPath } = await createGovernanceFixtures({
      policy: basePolicy,
      workflow: baseWorkflow,
    });

    const parsedPolicy = JSON.parse(basePolicy);
    const runner = vi.fn().mockReturnValueOnce([parsedPolicy]).mockReturnValueOnce([parsedPolicy]);

    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = runCheck({
      argv: ['--repo', 'acme/brujula-civil', '--policy', policyPath, '--workflow', workflowPath],
      logger,
      ghRunner: runner,
    });

    expect(exitCode).toBe(0);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns exit 1 when drift is detected', async () => {
    const { policyPath, workflowPath } = await createGovernanceFixtures({
      policy: basePolicy,
      workflow: baseWorkflow,
    });

    const drifted = JSON.parse(basePolicy);
    drifted.rules[0].parameters.required_status_checks = [
      { context: 'verify (ubuntu-latest)', integration_id: null },
    ];

    const runner = vi.fn().mockReturnValue([drifted]);
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = runCheck({
      argv: ['--repo', 'acme/brujula-civil', '--policy', policyPath, '--workflow', workflowPath],
      logger,
      ghRunner: runner,
    });

    expect(exitCode).toBe(1);
    expect(logger.log).toHaveBeenCalled();
  });

  it('returns exit 2 when check-name contract mismatches workflow', async () => {
    const mismatchedWorkflow = baseWorkflow.replace('windows-latest', 'macos-latest');
    const { policyPath, workflowPath } = await createGovernanceFixtures({
      policy: basePolicy,
      workflow: mismatchedWorkflow,
    });

    const runner = vi.fn();
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = runCheck({
      argv: ['--repo', 'acme/brujula-civil', '--policy', policyPath, '--workflow', workflowPath],
      logger,
      ghRunner: runner,
    });

    expect(exitCode).toBe(2);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Check-name contract mismatch'),
    );
    expect(runner).not.toHaveBeenCalled();
  });

  it('returns exit 2 when GitHub API access fails', async () => {
    const { policyPath, workflowPath } = await createGovernanceFixtures({
      policy: basePolicy,
      workflow: baseWorkflow,
    });

    const runner = vi.fn(() => {
      throw new Error('403 forbidden');
    });
    const logger = { log: vi.fn(), error: vi.fn() };

    const exitCode = runCheck({
      argv: ['--repo', 'acme/brujula-civil', '--policy', policyPath, '--workflow', workflowPath],
      logger,
      ghRunner: runner,
    });

    expect(exitCode).toBe(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('403 forbidden'));
  });
});
