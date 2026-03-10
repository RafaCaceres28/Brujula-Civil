import { z } from 'zod';

const stringArraySchema = z.array(z.string().trim().min(1)).default([]);

export const militarStepSchema = z.object({
  army: z.string().trim().nullable(),
  cuerpo: z.string().trim().nullable(),
  rank: z.string().trim().nullable(),
  specialty: z.string().trim().nullable(),
  yearsOfService: z.number().int().min(0).nullable(),
  destinationType: z.string().trim().nullable(),
});

export const experienciaStepSchema = z.object({
  responsibilities: stringArraySchema,
  missions: stringArraySchema,
  achievements: stringArraySchema,
  tools: stringArraySchema,
});

export const competenciasStepSchema = z.object({
  technicalSkills: stringArraySchema,
  softSkills: stringArraySchema,
  certifications: stringArraySchema,
  languages: stringArraySchema,
});

export const objetivosStepSchema = z.object({
  targetRoles: stringArraySchema,
  targetSectors: stringArraySchema,
  preferredLocations: stringArraySchema,
  workModel: z.enum(['onsite', 'hybrid', 'remote']).nullable(),
});

export const resumenStepSchema = z.object({
  confirmed: z.literal(true),
});
