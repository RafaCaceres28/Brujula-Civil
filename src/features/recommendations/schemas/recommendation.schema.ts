import { z } from 'zod';
import {
  domainIdSchema,
  localeSchema,
  timestampSchema,
} from '../../../lib/contracts/shared.schema';

const recommendationReasonSchema = z.string().trim().min(8).max(240);
const recommendationSignalSchema = z.string().trim().min(1).max(64);
const recommendationFitLabelSchema = z.enum(['alto', 'medio', 'exploratorio']);

export const recommendationExplanationSchema = z
  .object({
    reasonSummary: recommendationReasonSchema,
    fitLabel: recommendationFitLabelSchema,
    fitScore: z.number().int().min(0).max(100),
    explanationKeywords: z.array(recommendationSignalSchema).min(1).max(6),
    decisionGuidance: z.string().trim().min(8).max(240),
  })
  .strict();

export const recommendationRouteSchema = z
  .object({
    routeId: domainIdSchema,
    roleId: z.string().trim().min(1).max(64),
    sectorId: z.string().trim().min(1).max(64),
    seniorityId: z.string().trim().min(1).max(64).optional(),
    workModelId: z.string().trim().min(1).max(64).optional(),
    locationId: z.string().trim().min(1).max(64).optional(),
    reasonSummary: recommendationReasonSchema,
    matchedSignals: z.array(recommendationSignalSchema).min(1).max(12),
    explanation: recommendationExplanationSchema.optional(),
  })
  .strict();

export const recommendationOutputSchema = z
  .object({
    recommendationSetId: domainIdSchema,
    generatedAt: timestampSchema,
    routes: z.array(recommendationRouteSchema).min(3).max(5),
    sourceSnapshotId: domainIdSchema,
  })
  .strict();

export const recommendationSelectionSchema = z
  .object({
    recommendationSetId: domainIdSchema,
    selectedRouteId: domainIdSchema,
    selectedAt: timestampSchema,
  })
  .strict();

export const recommendationInputSnapshotSchema = z
  .object({
    userId: domainIdSchema,
    locale: localeSchema,
    snapshotId: domainIdSchema,
    branch: z.string().trim().min(1).max(64).optional(),
    corps: z.string().trim().min(1).max(64).optional(),
    rank: z.string().trim().min(1).max(64).optional(),
    specialty: z.string().trim().min(1).max(96).optional(),
    destinationContext: z.string().trim().min(1).max(96).optional(),
    leadership: z.boolean().optional(),
    teamSize: z.number().int().min(0).max(500).optional(),
    responsibilityAreas: z.array(z.string().trim().min(1).max(64)).max(16).default([]),
    missionTypes: z.array(z.string().trim().min(1).max(64)).max(16).default([]),
    functionTypes: z.array(z.string().trim().min(1).max(64)).max(16).default([]),
    tools: z.array(z.string().trim().min(1).max(64)).max(24).default([]),
    technicalSkills: z.array(z.string().trim().min(1).max(64)).max(32).default([]),
    softSkills: z.array(z.string().trim().min(1).max(64)).max(24).default([]),
    certifications: z.array(z.string().trim().min(1).max(96)).max(20).default([]),
    drivingLicenses: z.array(z.string().trim().min(1).max(32)).max(8).default([]),
    languages: z.array(z.string().trim().min(1).max(48)).max(12).default([]),
    officeTools: z.array(z.string().trim().min(1).max(48)).max(12).default([]),
    targetRoleHints: z.array(z.string().trim().min(1).max(64)).max(8).default([]),
    targetSectorHints: z.array(z.string().trim().min(1).max(64)).max(8).default([]),
    seniorityHint: z.string().trim().min(1).max(64).optional(),
    workModelHint: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export type RecommendationRoute = z.infer<typeof recommendationRouteSchema>;
export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;
export type RecommendationSelection = z.infer<typeof recommendationSelectionSchema>;
export type RecommendationInputSnapshot = z.infer<typeof recommendationInputSnapshotSchema>;
export type RecommendationFitLabel = z.infer<typeof recommendationFitLabelSchema>;
export type RecommendationExplanation = z.infer<typeof recommendationExplanationSchema>;
