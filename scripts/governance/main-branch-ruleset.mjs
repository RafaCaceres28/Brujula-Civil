import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { normalizeRuleset, stringifyRuleset } from './normalize-ruleset.mjs';

export const DEFAULT_POLICY_PATH = '.github/policies/main-branch-ruleset.json';
export const DEFAULT_VERIFY_WORKFLOW_PATH = '.github/workflows/verify.yml';
const GH_API_VERSION = '2022-11-28';

const parseArgs = (args) => {
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--') {
      continue;
    }

    if (!token.startsWith('--')) {
      continue;
    }

    if (token === '--json' || token === '--confirm') {
      parsed[token.slice(2)] = true;
      continue;
    }

    const nextToken = args[index + 1];
    if (!nextToken || nextToken.startsWith('--')) {
      throw new Error(`Missing value for ${token}`);
    }

    parsed[token.slice(2)] = nextToken;
    index += 1;
  }

  return parsed;
};

const normalizeRepoSlug = (repo) => {
  if (!repo || typeof repo !== 'string') {
    return null;
  }

  return repo.replace(/^https?:\/\/github\.com\//u, '').replace(/\.git$/u, '');
};

export const resolveRepository = (explicitRepo) => {
  const envRepo = process.env.GITHUB_REPOSITORY;
  const repo = normalizeRepoSlug(explicitRepo) ?? normalizeRepoSlug(envRepo);

  if (!repo || !repo.includes('/')) {
    throw new Error(
      'Repository slug is required. Pass --repo owner/name or set GITHUB_REPOSITORY.',
    );
  }

  return repo;
};

export const loadPolicy = (policyPath = DEFAULT_POLICY_PATH) => {
  const rawPolicy = readFileSync(policyPath, 'utf8');
  const parsedPolicy = JSON.parse(rawPolicy);
  return normalizeRuleset(parsedPolicy);
};

export const deriveExpectedChecksFromWorkflow = (workflowPath = DEFAULT_VERIFY_WORKFLOW_PATH) => {
  const workflow = readFileSync(workflowPath, 'utf8');
  const hasMatrixTemplate = /name:\s*verify\s*\(\$\{\{\s*matrix\.os\s*\}\}\)/u.test(workflow);
  const osBlockMatch = workflow.match(/matrix:\s*[\s\S]*?\n\s*os:\s*\n((?:\s+-\s+[^\n]+\n)+)/u);

  if (!hasMatrixTemplate || !osBlockMatch) {
    throw new Error(
      `Unable to derive required checks from ${workflowPath}. Expected verify matrix naming contract.`,
    );
  }

  const osValues = osBlockMatch[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);

  if (osValues.length === 0) {
    throw new Error(`No matrix.os values found in ${workflowPath}.`);
  }

  return osValues.map((osName) => `verify (${osName})`).sort((a, b) => a.localeCompare(b));
};

export const getPolicyCheckContexts = (policy) => {
  const statusRule = policy.rules.find((rule) => rule.type === 'required_status_checks');

  if (!statusRule) {
    throw new Error('Policy is missing required_status_checks rule.');
  }

  return statusRule.parameters.required_status_checks
    .map((item) => item.context)
    .sort((a, b) => a.localeCompare(b));
};

export const validateCheckNameContract = (policy, expectedChecks) => {
  const policyChecks = getPolicyCheckContexts(policy);
  const isEqual = JSON.stringify(policyChecks) === JSON.stringify(expectedChecks);

  return {
    valid: isEqual,
    policyChecks,
    expectedChecks,
    missingInPolicy: expectedChecks.filter((check) => !policyChecks.includes(check)),
    extraInPolicy: policyChecks.filter((check) => !expectedChecks.includes(check)),
  };
};

const ghApiPath = (repo, suffix) => `/repos/${repo}${suffix}`;

export const runGhApi = ({ method = 'GET', path, input, runner = execFileSync }) => {
  const args = [
    'api',
    '--method',
    method,
    '-H',
    'Accept: application/vnd.github+json',
    '-H',
    `X-GitHub-Api-Version: ${GH_API_VERSION}`,
    path,
  ];

  const options = {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  if (input) {
    args.push('--input', '-');
    options.input = JSON.stringify(input);
  }

  try {
    const output = runner('gh', args, options);
    return output ? JSON.parse(output) : null;
  } catch (error) {
    const stderr = error?.stderr?.toString?.() ?? error?.message ?? String(error);
    throw new Error(`GitHub API call failed (${method} ${path}): ${stderr.trim()}`);
  }
};

export const fetchRepositoryRulesets = (repo, ghRunner = runGhApi) => {
  const response = ghRunner({ method: 'GET', path: ghApiPath(repo, '/rulesets') });
  return Array.isArray(response) ? response : [];
};

export const selectMainBranchRuleset = (rulesets, policy) => {
  const byName = rulesets.find((ruleset) => ruleset.name === policy.name);
  if (byName) {
    return byName;
  }

  return rulesets.find((ruleset) => {
    if (ruleset.target !== 'branch') {
      return false;
    }

    const includeList = ruleset?.conditions?.ref_name?.include ?? [];
    return includeList.includes('~DEFAULT_BRANCH') || includeList.includes('refs/heads/main');
  });
};

export const diffRulesets = (policy, liveRuleset) => {
  const normalizedPolicy = normalizeRuleset(policy);
  const normalizedLive = liveRuleset ? normalizeRuleset(liveRuleset) : null;

  return {
    drift:
      !normalizedLive || stringifyRuleset(normalizedPolicy) !== stringifyRuleset(normalizedLive),
    desired: normalizedPolicy,
    actual: normalizedLive,
  };
};

export const verifyApplyAuthorization = (repo, ghRunner = runGhApi) => {
  const repository = ghRunner({ method: 'GET', path: ghApiPath(repo, '') });
  const permissions = repository?.permissions;

  if (!permissions) {
    return;
  }

  const canWrite = Boolean(permissions.admin || permissions.maintain);
  if (!canWrite) {
    throw new Error(
      'Token does not have admin/maintain permissions required to apply ruleset changes.',
    );
  }
};

export const reconcileRuleset = ({
  repo,
  policyPath = DEFAULT_POLICY_PATH,
  workflowPath = DEFAULT_VERIFY_WORKFLOW_PATH,
  apply = false,
  confirm = false,
  ghRunner = runGhApi,
}) => {
  const resolvedRepo = resolveRepository(repo);
  const policy = loadPolicy(policyPath);
  const expectedChecks = deriveExpectedChecksFromWorkflow(workflowPath);
  const contract = validateCheckNameContract(policy, expectedChecks);

  if (!contract.valid) {
    throw new Error(
      [
        'Check-name contract mismatch between workflow and policy.',
        `Missing in policy: ${contract.missingInPolicy.join(', ') || '(none)'}`,
        `Unexpected in policy: ${contract.extraInPolicy.join(', ') || '(none)'}`,
        'Update .github/workflows/verify.yml and policy artifact atomically.',
      ].join(' '),
    );
  }

  const currentRulesets = fetchRepositoryRulesets(resolvedRepo, ghRunner);
  const liveRuleset = selectMainBranchRuleset(currentRulesets, policy);
  const initialDiff = diffRulesets(policy, liveRuleset);

  if (!apply) {
    return {
      mode: 'check',
      repo: resolvedRepo,
      drift: initialDiff.drift,
      existingRulesetId: liveRuleset?.id ?? null,
      desired: initialDiff.desired,
      actual: initialDiff.actual,
      message: initialDiff.drift
        ? 'Drift detected between local policy and GitHub ruleset.'
        : 'No drift detected. GitHub ruleset matches local policy.',
    };
  }

  if (!confirm) {
    throw new Error('Refusing mutation: run apply with --confirm to acknowledge state changes.');
  }

  verifyApplyAuthorization(resolvedRepo, ghRunner);

  if (!initialDiff.drift) {
    return {
      mode: 'apply',
      repo: resolvedRepo,
      drift: false,
      changed: false,
      existingRulesetId: liveRuleset?.id ?? null,
      message: 'No drift detected. Apply skipped.',
    };
  }

  const payload = initialDiff.desired;

  if (liveRuleset?.id) {
    ghRunner({
      method: 'PUT',
      path: ghApiPath(resolvedRepo, `/rulesets/${liveRuleset.id}`),
      input: payload,
    });
  } else {
    ghRunner({
      method: 'POST',
      path: ghApiPath(resolvedRepo, '/rulesets'),
      input: payload,
    });
  }

  const refreshedRulesets = fetchRepositoryRulesets(resolvedRepo, ghRunner);
  const refreshedLive = selectMainBranchRuleset(refreshedRulesets, policy);
  const finalDiff = diffRulesets(policy, refreshedLive);

  if (finalDiff.drift) {
    throw new Error(
      'Apply finished but readback still reports drift. Manual investigation required.',
    );
  }

  return {
    mode: 'apply',
    repo: resolvedRepo,
    drift: false,
    changed: true,
    existingRulesetId: refreshedLive?.id ?? liveRuleset?.id ?? null,
    message: 'Ruleset reconciled successfully.',
  };
};

export const parseGovernanceArgs = (argv) => parseArgs(argv);
