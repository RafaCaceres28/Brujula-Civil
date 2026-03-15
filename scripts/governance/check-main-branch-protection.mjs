import { parseGovernanceArgs, reconcileRuleset } from './main-branch-ruleset.mjs';

const formatReport = (result) => {
  if (!result.drift) {
    return `PASS: ${result.message}`;
  }

  const desired = JSON.stringify(result.desired, null, 2);
  const actual = JSON.stringify(result.actual, null, 2);
  return [
    `FAIL: ${result.message}`,
    'Desired policy (normalized):',
    desired,
    'Current GitHub ruleset (normalized):',
    actual,
  ].join('\n');
};

/**
 * @param {{
 *   argv?: string[];
 *   logger?: { log: (message: string) => void; error: (message: string) => void };
 *   ghRunner?: (request: { method?: string; path: string; input?: unknown }) => unknown;
 * }} [options]
 */
export const runCheck = ({
  argv = process.argv.slice(2),
  logger = /** @type {{ log: (message: string) => void; error: (message: string) => void }} */ (
    console
  ),
  ghRunner,
} = {}) => {
  try {
    const args = parseGovernanceArgs(argv);
    const result = reconcileRuleset({
      repo: args.repo,
      policyPath: args.policy,
      workflowPath: args.workflow,
      apply: false,
      ghRunner,
    });

    if (args.json) {
      logger.log(JSON.stringify(result, null, 2));
    } else {
      logger.log(formatReport(result));
    }

    return result.drift ? 1 : 0;
  } catch (error) {
    logger.error(`ERROR: ${error.message}`);
    return 2;
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = runCheck();
}
