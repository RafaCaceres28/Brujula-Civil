import type { DomainError, DomainResult } from '../../../lib/contracts/index';
import type { LinkedInNormalizedProfile, LinkedInSourceInput } from '../schemas/linkedin.schema';

export type LinkedInContractVersion = `${number}.${number}.${number}`;

export type LinkedInDomainInput = LinkedInSourceInput;

export type LinkedInDomainOutput = LinkedInNormalizedProfile;

export type LinkedInDomainError = DomainError;

export type LinkedInDomainResult = DomainResult<LinkedInDomainOutput, LinkedInDomainError>;
