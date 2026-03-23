import { domainFailure, domainSuccess, toInternalDomainError } from '@/lib/contracts/index';
import { linkedInNormalizedProfileSchema } from '@/features/linkedin/schemas/linkedin.schema';
import type {
  LinkedInDomainInput,
  LinkedInDomainOutput,
  LinkedInDomainResult,
} from '@/features/linkedin/types/linkedin.types';

const pickSkillsFromRawPayload = (rawProfilePayload: unknown): string[] => {
  if (!rawProfilePayload || typeof rawProfilePayload !== 'object') {
    return [];
  }

  const payload = rawProfilePayload as { skills?: unknown };
  if (!Array.isArray(payload.skills)) {
    return [];
  }

  return payload.skills
    .filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0)
    .map((skill) => skill.trim())
    .slice(0, 10);
};

const buildLinkedInOutput = (input: LinkedInDomainInput): LinkedInDomainOutput => {
  return linkedInNormalizedProfileSchema.parse({
    headline: input.profileUrl ? 'Profile imported from LinkedIn URL' : null,
    experience: [],
    education: [],
    skills: pickSkillsFromRawPayload(input.rawProfilePayload),
  });
};

export async function generateLinkedInProfile(
  input: LinkedInDomainInput,
): Promise<LinkedInDomainResult> {
  try {
    return domainSuccess(buildLinkedInOutput(input));
  } catch (error) {
    return domainFailure(toInternalDomainError(error, 'Failed to generate LinkedIn profile'));
  }
}
