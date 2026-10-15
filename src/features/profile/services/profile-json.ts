import { z } from 'zod';
import { careerHistorySchema } from '../../translation/schemas/career-history.schema';

export const militaryProfileJsonSchema = z
  .object({ careerHistory: careerHistorySchema.optional() })
  .loose();

const profileJsonSchema = z.record(z.string(), z.unknown());

// Merge owned snapshot fields without discarding unrelated nested metadata.
// Arrays and null are replacements, not object patches.
export function mergeProfileJson(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...profileJsonSchema.parse(existing) };
  for (const [key, value] of Object.entries(patch)) {
    const previous = merged[key];
    merged[key] =
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      previous !== null &&
      typeof previous === 'object' &&
      !Array.isArray(previous)
        ? mergeProfileJson(previous, value as Record<string, unknown>)
        : value;
  }
  return merged;
}
