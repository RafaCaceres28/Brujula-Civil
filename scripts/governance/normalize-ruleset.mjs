const sortStrings = (value) => [...value].sort((a, b) => a.localeCompare(b));

const normalizeRequiredStatusChecks = (rule) => {
  const checks = rule?.parameters?.required_status_checks ?? [];
  const normalizedChecks = checks
    .map((check) => ({
      context: check?.context ?? '',
      integration_id:
        typeof check?.integration_id === 'number' || check?.integration_id === null
          ? check.integration_id
          : null,
    }))
    .sort((a, b) => a.context.localeCompare(b.context));

  return {
    type: 'required_status_checks',
    parameters: {
      strict_required_status_checks_policy: Boolean(
        rule?.parameters?.strict_required_status_checks_policy,
      ),
      required_status_checks: normalizedChecks,
    },
  };
};

const normalizePullRequestRule = (rule) => ({
  type: 'pull_request',
  parameters: {
    required_approving_review_count: Number(rule?.parameters?.required_approving_review_count ?? 0),
    dismiss_stale_reviews_on_push: Boolean(rule?.parameters?.dismiss_stale_reviews_on_push),
    require_code_owner_review: Boolean(rule?.parameters?.require_code_owner_review),
    require_last_push_approval: Boolean(rule?.parameters?.require_last_push_approval),
    required_review_thread_resolution: Boolean(rule?.parameters?.required_review_thread_resolution),
  },
});

const normalizeRule = (rule) => {
  switch (rule?.type) {
    case 'required_status_checks':
      return normalizeRequiredStatusChecks(rule);
    case 'pull_request':
      return normalizePullRequestRule(rule);
    case 'non_fast_forward':
      return { type: 'non_fast_forward' };
    default:
      return {
        type: rule?.type ?? 'unknown',
        parameters: rule?.parameters ?? null,
      };
  }
};

const normalizeBypassActors = (bypassActors) =>
  (bypassActors ?? [])
    .map((actor) => ({
      actor_id:
        typeof actor?.actor_id === 'number' || actor?.actor_id === null ? actor.actor_id : null,
      actor_type: actor?.actor_type ?? 'RepositoryRole',
      bypass_mode: actor?.bypass_mode ?? 'always',
    }))
    .sort((a, b) => {
      const left = `${a.actor_type}:${a.actor_id}:${a.bypass_mode}`;
      const right = `${b.actor_type}:${b.actor_id}:${b.bypass_mode}`;
      return left.localeCompare(right);
    });

const normalizeConditions = (conditions) => ({
  ref_name: {
    include: sortStrings(conditions?.ref_name?.include ?? ['~DEFAULT_BRANCH']),
    exclude: sortStrings(conditions?.ref_name?.exclude ?? []),
  },
});

export const normalizeRuleset = (ruleset) => ({
  name: ruleset?.name ?? 'main-branch-protection',
  target: ruleset?.target ?? 'branch',
  enforcement: ruleset?.enforcement ?? 'active',
  conditions: normalizeConditions(ruleset?.conditions),
  rules: (ruleset?.rules ?? []).map(normalizeRule).sort((a, b) => a.type.localeCompare(b.type)),
  bypass_actors: normalizeBypassActors(ruleset?.bypass_actors),
});

export const stringifyRuleset = (ruleset) => JSON.stringify(normalizeRuleset(ruleset));
