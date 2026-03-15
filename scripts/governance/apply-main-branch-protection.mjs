import { parseGovernanceArgs, reconcileRuleset } from './main-branch-ruleset.mjs';

const formatApplyResult = (result) => {
  if (!result.changed) {
    return `SKIP: ${result.message}`;
  }

  return `APPLIED: ${result.message} Ruleset ID: ${result.existingRulesetId ?? 'created'}.`;
};

/**
 * @param {{
 *   argv?: string[];
 *   logger?: { log: (message: string) => void; error: (message: string) => void };
 *   ghRunner?: (request: { method?: string; path: string; input?: unknown }) => unknown;
 * }} [options]
 */
export const runApply = ({
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
      apply: true,
      confirm: Boolean(args.confirm),
      ghRunner,
    });

    if (args.json) {
      logger.log(JSON.stringify(result, null, 2));
    } else {
      logger.log(formatApplyResult(result));
    }

    return 0;
  } catch (error) {
    logger.error(`ERROR: ${error.message}`);
    return 2;
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = runApply();
}
